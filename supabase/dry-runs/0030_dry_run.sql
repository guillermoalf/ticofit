-- PRUEBA de la migración 0030 (rol Dueño y borrar/revertir). NO es una migración y NO guarda nada.
-- Migración probada: sha256 4c868f50e49d3ef27a4bb49079f6cb3e8b9323cd0c14de73c0c72bfa8536af2e
--
-- Pegá TODO en el SQL Editor de Supabase y dale Run.
-- Siempre termina en "error", a propósito, para deshacer todo:
--   DRYRUN_OK ...     = pasó todo
--   DRYRUN_FALLAS ... = corrió y encontró problemas
--   cualquier otro    = se cayó antes de terminar (igual no guarda nada)
-- Copiá solo la primera línea del mensaje.

do $dry$
declare resultado text;
begin
  begin
execute $mig$
-- 0030: the Dueño role and undo (borrar o revertir) for the owners.
-- Run in the Supabase SQL editor after supabase/dry-runs/0030_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023–0029.
--
-- WHY
--   Guillermo and Jeremy are the only people who can do absolutely everything,
--   payroll included, and every mistake or test has to be removable. The system is
--   tried out on production data before real use, so the owners need to undo.
--
-- MODEL
--   * Role `owner` (Dueño): every permission, plus `data.delete`, which nobody else
--     holds. An owner always manages payroll (forced on save).
--   * Only an owner may make someone an owner, change an owner, or edit an owner's
--     record. There is always at least one active owner.
--   * owner_delete(kind, id): one entry point that deletes a record and reverts what
--     it caused (a deleted payment takes its months off the membership; a deleted
--     approved receipt takes its payment with it; a deleted payment from a receipt
--     sends the receipt back to "pendiente"). It returns the storage files and the
--     client login the server must remove afterwards (SQL can't delete either).

-- 1. Role and permission -------------------------------------------------------------------
insert into public.staff_roles (id, label, sort_order) values ('owner', 'Dueño', 0)
on conflict (id) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.staff_permissions (id, label) values ('data.delete', 'Borrar o revertir cualquier registro')
on conflict (id) do nothing;

insert into public.staff_role_permissions (role_id, permission_id)
select 'owner', id from public.staff_permissions
on conflict do nothing;

-- Guillermo is the first owner (before the guard exists, which needs an owner acting).
update public.staff set role_id = 'owner', can_manage_payroll = true
where id = '423357a5-633c-40f9-86a5-47c433075e11' and role_id <> 'owner';

-- 2. Who is an owner ----------------------------------------------------------------------------
create or replace function public.staff_is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.staff where id = public.current_staff_id() and role_id = 'owner');
$$;

-- Only an owner creates, changes or removes an owner; owners always hold payroll;
-- the last active owner can't stop being one.
create or replace function public.guard_owner_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role_id = 'owner' or (tg_op = 'UPDATE' and old.role_id = 'owner') then
    if not public.staff_is_owner() then
      raise exception 'OWNER_ONLY' using errcode = '42501';
    end if;
  end if;
  if new.role_id = 'owner' then
    new.can_manage_payroll := true;
  end if;
  if tg_op = 'UPDATE' and old.role_id = 'owner' and old.active
     and (new.role_id <> 'owner' or not new.active)
     and not exists (select 1 from public.staff where role_id = 'owner' and active and id <> old.id) then
    raise exception 'LAST_OWNER' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_owner_role on public.staff;
create trigger guard_owner_role before insert or update of role_id, active, can_manage_payroll on public.staff
  for each row execute function public.guard_owner_role();

-- An owner's record (name, PIN, sedes) is administered by owners only.
create or replace function public.staff_manageable(p_staff_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.staff_can('employees.manage') and exists (
    select 1 from public.staff t
    join public.staff_sedes ss on ss.staff_id = t.id
    where t.id = p_staff_id
      and ss.sede_id in (select public.staff_sede_ids())
      and (not t.can_manage_payroll or public.staff_can('payroll.manage'))
      and (t.role_id <> 'owner' or public.staff_is_owner())
  );
$$;

-- 3. Undo ---------------------------------------------------------------------------------------
-- Returns {"files": [receipt paths to remove from storage], "user_id": client login to remove}.
create or replace function public.owner_delete(p_kind text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client  uuid;
  v_sede    text;
  v_user    uuid;
  v_email   text;
  v_files   text[] := '{}';
  v_pay     public.payments%rowtype;
  v_rec     public.payment_receipts%rowtype;
  v_months  integer;
  v_me      uuid := public.current_staff_id();
begin
  if not public.staff_can('data.delete') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_kind = 'client' then
    select id, user_id, email into v_client, v_user, v_email from public.clients where id = p_id;
    if v_client is null or not public.staff_can_client('data.delete', v_client) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    select coalesce(array_agg(file_path), '{}') into v_files from public.payment_receipts where client_id = v_client;
    -- Only a client login is ever handed back for removal, never a desk.
    if v_user is not null and not exists (select 1 from public.profiles where id = v_user and role::text = 'client') then
      v_user := null;
    end if;
    if v_email is not null then
      delete from public.preauthorized_emails where email = v_email and intended_role::text = 'client';
    end if;
    delete from public.payments where client_id = v_client;
    delete from public.clients where id = v_client;
    return jsonb_build_object('files', to_jsonb(v_files), 'user_id', v_user);

  elsif p_kind = 'measurement' then
    select client_id into v_client from public.client_measurements where id = p_id;
    if v_client is null or not public.staff_can_client('data.delete', v_client) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.client_measurements where id = p_id;

  elsif p_kind = 'clinical' then
    select client_id into v_client from public.client_clinical_history where id = p_id;
    if v_client is null or not public.staff_can_client('data.delete', v_client) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.client_clinical_history where id = p_id;

  elsif p_kind = 'routine' then
    -- Assigned routines only; templates have their own delete.
    select client_id into v_client from public.client_routines where id = p_id;
    if v_client is null or not public.staff_can_client('data.delete', v_client) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.client_routines where id = p_id;

  elsif p_kind = 'payment' then
    select * into v_pay from public.payments where id = p_id for update;
    if v_pay.id is null or not public.staff_can_client('data.delete', v_pay.client_id) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.payments where id = v_pay.id;
    update public.client_memberships
    set periods_paid = greatest(0, periods_paid - v_pay.periods), updated_at = now(), updated_by_staff = v_me
    where client_id = v_pay.client_id;
    if v_pay.receipt_id is not null then
      update public.payment_receipts
      set status = 'pending', reviewed_by_staff = null, reviewed_at = null, reject_reason = null
      where id = v_pay.receipt_id;
    end if;

  elsif p_kind = 'receipt' then
    select * into v_rec from public.payment_receipts where id = p_id for update;
    if v_rec.id is null or not public.staff_can_client('data.delete', v_rec.client_id) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.payments where receipt_id = v_rec.id returning periods into v_months;
    if v_months is not null then
      update public.client_memberships
      set periods_paid = greatest(0, periods_paid - v_months), updated_at = now(), updated_by_staff = v_me
      where client_id = v_rec.client_id;
    end if;
    delete from public.payment_receipts where id = v_rec.id;
    v_files := array[v_rec.file_path];

  elsif p_kind = 'membership' then
    -- p_id is the client: their plan, its history and every payment go; approved
    -- receipts go back to "pendiente" so nothing the client uploaded is lost.
    if not public.staff_can_client('data.delete', p_id) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    update public.payment_receipts
    set status = 'pending', reviewed_by_staff = null, reviewed_at = null, reject_reason = null
    where client_id = p_id and status = 'approved';
    delete from public.payments where client_id = p_id;
    delete from public.membership_events where client_id = p_id;
    delete from public.client_memberships where client_id = p_id;

  elsif p_kind = 'class' then
    select sede_id into v_sede from public.classes where id = p_id;
    if v_sede is null or v_sede not in (select public.staff_sede_ids()) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.classes where id = p_id;

  elsif p_kind = 'reservation' then
    select c.sede_id into v_sede
    from public.class_reservations r join public.classes c on c.id = r.class_id
    where r.id = p_id;
    if v_sede is null or v_sede not in (select public.staff_sede_ids()) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.class_reservations where id = p_id;

  elsif p_kind = 'staff' then
    if p_id = v_me then
      raise exception 'NOT_SELF' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.staff_sedes where staff_id = p_id and sede_id in (select public.staff_sede_ids())
    ) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    if exists (select 1 from public.payroll_lines where staff_id = p_id) then
      raise exception 'STAFF_IN_PAYROLL' using errcode = '22023';
    end if;
    if exists (select 1 from public.staff where id = p_id and role_id = 'owner' and active)
       and not exists (select 1 from public.staff where role_id = 'owner' and active and id <> p_id) then
      raise exception 'LAST_OWNER' using errcode = '22023';
    end if;
    delete from public.staff where id = p_id;

  elsif p_kind = 'payroll_run' then
    -- Any status: a payroll approved or paid by mistake can be removed too.
    if not exists (select 1 from public.payroll_runs where id = p_id)
       or (exists (select 1 from public.payroll_lines where run_id = p_id)
           and not exists (
             select 1 from public.payroll_lines l join public.staff_sedes ss on ss.staff_id = l.staff_id
             where l.run_id = p_id and ss.sede_id in (select public.staff_sede_ids()))) then
      raise exception 'NOT_FOUND' using errcode = '22023';
    end if;
    delete from public.payroll_runs where id = p_id;

  else
    raise exception 'UNKNOWN_KIND' using errcode = '22023';
  end if;

  return jsonb_build_object('files', to_jsonb(v_files), 'user_id', null);
end;
$$;

-- 4. Grants --------------------------------------------------------------------------------------
revoke all on function public.staff_is_owner() from public, anon;
revoke all on function public.guard_owner_role() from public, anon, authenticated;
revoke all on function public.owner_delete(text, uuid) from public, anon;
grant execute on function public.staff_is_owner() to authenticated;
grant execute on function public.owner_delete(text, uuid) to authenticated;

$mig$;
execute $tests$

create function public.dryrun_check(p_name text, p_sql text, p_expected text) returns text
language plpgsql as $c$
declare n integer; got text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception 'ok:%', n;
  exception when others then got := sqlerrm;
  end;
  if got like p_expected then return null; end if;
  return p_name || ' => ' || got;
end $c$;
grant execute on function public.dryrun_check(text, text, text) to anon, authenticated;
create function public.dryrun_value(p_sql text) returns text language plpgsql as $v$
declare r text; begin execute p_sql into r; return r; end $v$;
grant execute on function public.dryrun_value(text) to anon, authenticated;

do $t$
declare
  desk_id uuid; desk text; o uuid := '423357a5-633c-40f9-86a5-47c433075e11';
  b uuid; c uuid; k uuid; u1 uuid := gen_random_uuid(); j2 uuid; pay uuid; rec uuid; m uuid; h uuid; rt uuid;
  s1 uuid; d1 uuid; cl uuid; res uuid; run uuid; plan uuid;
  ho text := '{"x-staff-token":"dry-o"}'; hb text := '{"x-staff-token":"dry-b"}'; hc text := '{"x-staff-token":"dry-c"}';
  f text[] := '{}'; v text; r jsonb;
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;

  -- shapes
  if (select count(*) from public.staff_role_permissions where role_id = 'owner') <> (select count(*) from public.staff_permissions)
    then f := f || 'owner lacks a permission'::text; end if;
  if exists (select 1 from public.staff_role_permissions where permission_id = 'data.delete' and role_id <> 'owner')
    then f := f || 'data.delete outside owner'::text; end if;
  if (select role_id || can_manage_payroll::text from public.staff where id = o) <> 'ownertrue' then f := f || 'guillermo not owner'::text; end if;

  -- people and data (as postgres)
  insert into public.staff (full_name, role_id) values ('DEMO Admin', 'admin') returning id into b;
  insert into public.staff (full_name, role_id) values ('DEMO Coach', 'coach') returning id into c;
  insert into public.staff_sedes values (b,'bellavista'),(c,'bellavista');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at) values
    (encode(extensions.digest('dry-o','sha256'),'hex'), o, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('dry-b','sha256'),'hex'), b, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('dry-c','sha256'),'hex'), c, desk_id, now() + interval '5 minutes');
  insert into public.profiles (id, full_name, role, authorized) values (u1, 'DEMO Cliente', 'client', true);
  insert into public.clients (sede_id, full_name, email, user_id) values ('bellavista', 'DEMO Cliente', 'demo-0030@ticofit.test', u1) returning id into k;
  insert into public.preauthorized_emails (email, intended_role, full_name) values ('demo-0030@ticofit.test', 'client', 'DEMO Cliente');
  select id into plan from public.plans where sede_id = 'bellavista' and kind = 'membership' and active order by sort_order limit 1;
  insert into public.client_memberships (client_id, plan_id, start_date) values (k, plan, public.today_cr());
  insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (k, public.today_cr(), 165, 62) returning id into m;
  insert into public.client_clinical_history (client_id) values (k) returning id into h;
  insert into public.client_routines (client_id, sede_id, name, valid_from, valid_weeks, assigned_at)
    values (k, 'bellavista', 'DEMO Rutina', public.today_cr(), 4, now()) returning id into rt;
  insert into storage.objects (bucket_id, name) values ('receipts', k || '/dry-0030.png');
  insert into public.payment_receipts (client_id, file_path, amount_crc, paid_on) values (k, k || '/dry-0030.png', 40000, public.today_cr()) returning id into rec;
  select id into s1 from public.salones where sede_id = 'bellavista' order by sort_order limit 1;
  select id into d1 from public.disciplines where slug = 'yoga';
  insert into public.classes (sede_id, discipline_id, salon_id, starts_at, ends_at, capacity) values
    ('bellavista', d1, s1, now() + interval '1 day', now() + interval '1 day 1 hour', 8) returning id into cl;
  insert into public.class_reservations (class_id, client_id) values (cl, k) returning id into res;
  insert into public.payroll_runs (period, period_start, period_end, status) values ('monthly', '2026-01-01', '2026-01-31', 'paid') returning id into run;

  perform set_config('request.jwt.claims', desk, true);
  execute 'set local role authenticated';

  -- admin: no undo, no owners
  perform set_config('request.headers', hb, true);
  f := f || public.dryrun_check('admin deletes', format($q$select public.owner_delete('measurement', %L)$q$, m), '%NOT_ALLOWED%');
  f := f || public.dryrun_check('admin creates owner', $q$select public.staff_create('DEMO X', 'owner', array['bellavista'], '1234')$q$, '%OWNER_ONLY%');
  f := f || public.dryrun_check('admin promotes coach', format($q$update public.staff set role_id = 'owner' where id = %L$q$, c), '%OWNER_ONLY%');
  f := f || public.dryrun_check('admin edits owner', format($q$update public.staff set full_name = 'DEMO' where id = %L$q$, o), 'ok:0');
  f := f || public.dryrun_check('admin resets owner pin', format($q$select public.staff_set_pin(%L, '1111')$q$, o), '%NOT_ALLOWED%');
  if public.staff_is_owner() then f := f || 'admin is owner'::text; end if;

  -- coach
  perform set_config('request.headers', hc, true);
  f := f || public.dryrun_check('coach deletes', format($q$select public.owner_delete('client', %L)$q$, k), '%NOT_ALLOWED%');

  -- owner
  perform set_config('request.headers', ho, true);
  if not public.staff_is_owner() then f := f || 'owner not owner'::text; end if;
  j2 := public.staff_create('DEMO Jeremy', 'owner', array['bellavista','cafe'], '1234');
  if (select can_manage_payroll from public.staff where id = j2) is not true then f := f || 'new owner without payroll'::text; end if;
  f := f || public.dryrun_check('owner unsets payroll', format($q$update public.staff set can_manage_payroll = false where id = %L$q$, j2), 'ok:1');
  if (select can_manage_payroll from public.staff where id = j2) is not true then f := f || 'owner payroll dropped'::text; end if;
  f := f || public.dryrun_check('owner deactivates owner', format($q$update public.staff set active = false where id = %L$q$, j2), 'ok:1');
  f := f || public.dryrun_check('last owner demotes self', format($q$update public.staff set role_id = 'admin' where id = %L$q$, o), '%LAST_OWNER%');
  f := f || public.dryrun_check('delete self', format($q$select public.owner_delete('staff', %L)$q$, o), '%NOT_SELF%');

  -- payments: cash, then undo
  pay := public.payment_record_cash(k, 40000, public.today_cr(), 2::smallint);
  r := public.owner_delete('payment', pay);
  if (select periods_paid from public.client_memberships where client_id = k) <> 0 then f := f || 'cash undo months'::text; end if;
  -- receipt approved, its payment undone -> receipt back to pending
  perform public.receipt_review(rec, true);
  select id into pay from public.payments where receipt_id = rec;
  r := public.owner_delete('payment', pay);
  if (select status from public.payment_receipts where id = rec) <> 'pending' then f := f || 'receipt not pending'::text; end if;
  if (select periods_paid from public.client_memberships where client_id = k) <> 0 then f := f || 'receipt payment undo months'::text; end if;
  -- approved again, then the receipt itself deleted
  perform public.receipt_review(rec, true);
  r := public.owner_delete('receipt', rec);
  if exists (select 1 from public.payments where client_id = k) then f := f || 'receipt payment left'::text; end if;
  if (select periods_paid from public.client_memberships where client_id = k) <> 0 then f := f || 'receipt undo months'::text; end if;
  if r -> 'files' ->> 0 is distinct from k || '/dry-0030.png' then f := f || ('receipt files ' || r::text)::text; end if;

  r := public.owner_delete('measurement', m);
  if exists (select 1 from public.client_measurements where id = m) then f := f || 'measurement left'::text; end if;
  r := public.owner_delete('clinical', h);
  if exists (select 1 from public.client_clinical_history where id = h) then f := f || 'clinical left'::text; end if;
  r := public.owner_delete('routine', rt);
  if exists (select 1 from public.client_routines where id = rt) then f := f || 'routine left'::text; end if;
  r := public.owner_delete('reservation', res);
  if exists (select 1 from public.class_reservations where id = res) then f := f || 'reservation left'::text; end if;
  r := public.owner_delete('class', cl);
  if exists (select 1 from public.classes where id = cl) then f := f || 'class left'::text; end if;
  r := public.owner_delete('payroll_run', run);
  if exists (select 1 from public.payroll_runs where id = run) then f := f || 'paid run left'::text; end if;
  r := public.owner_delete('membership', k);
  if exists (select 1 from public.client_memberships where client_id = k) then f := f || 'membership left'::text; end if;
  r := public.owner_delete('staff', c);
  if exists (select 1 from public.staff where id = c) then f := f || 'staff left'::text; end if;
  f := f || public.dryrun_check('unknown kind', format($q$select public.owner_delete('nada', %L)$q$, k), '%UNKNOWN_KIND%');
  f := f || public.dryrun_check('missing id', format($q$select public.owner_delete('measurement', %L)$q$, gen_random_uuid()), '%NOT_FOUND%');

  r := public.owner_delete('client', k);
  if exists (select 1 from public.clients where id = k) then f := f || 'client left'::text; end if;
  if r ->> 'user_id' is distinct from u1::text then f := f || ('client login ' || r::text)::text; end if;
  if exists (select 1 from public.preauthorized_emails where email = 'demo-0030@ticofit.test') then f := f || 'invite left'::text; end if;

  -- anon
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  f := f || public.dryrun_check('anon deletes', format($q$select public.owner_delete('client', %L)$q$, k), '%permission denied%');
  execute 'reset role';

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'DRYRUN_OK: todas las pruebas de la 0030 pasaron'; end if;
  raise exception 'DRYRUN_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;

$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'DRYRUN_ABORT: sin resultado');
end
$dry$;
