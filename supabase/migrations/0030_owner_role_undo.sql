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
