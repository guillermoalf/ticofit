-- PRUEBA de la migración 0024 (64 casos). NO es una migración y NO guarda nada.
-- Migración probada: sha256 713abc524a7da9ce8b9675fd2e18402c2af4556624130f8d05e8a551a73b8372
--
-- Pegá TODO en el SQL Editor de Supabase (proyecto branjuyfmqqrbisclasy) y dale Run.
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
-- 0024: clients, clinical history and measurements (phase 2).
-- Run in the Supabase SQL editor after supabase/dry-runs/0024_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023.
--
-- WHY NEW TABLES (PROGRESS.md A6)
--   * public.profiles is self-editable: "update own profile" plus a grant on every
--     column lets a client rewrite anything in their row. The sede, the join date
--     (billing day) and what staff record about them can't live there.
--   * A client is a file the sede owns, with or without a login. clients.user_id
--     links the login once there is one.
--   * public.measurements (0003 + 0011) carries stored percentages, litres of
--     water and InBody fields the sheet doesn't have, under coach-ownership RLS.
--     It is empty and left untouched; client_measurements follows the sheet.
--
-- WHO SEES WHAT
--   staff   → clients of the sedes they work in, per permission, only with a live
--             PIN session on a desk of that sede.
--   client  → their own file, history and measurements. Read only.
--   anon    → nothing.

-- 1. Client file (the top of the sheet) ---------------------------------------
create table if not exists public.clients (
  id                             uuid primary key default gen_random_uuid(),
  user_id                        uuid unique references public.profiles (id) on delete set null,
  sede_id                        text not null references public.sedes (id),
  full_name                      text not null check (char_length(btrim(full_name)) between 2 and 120),
  email                          text check (email = lower(btrim(email)) and position('@' in email) > 1),
  national_id                    text check (char_length(national_id) <= 30),
  address                        text check (char_length(address) <= 300),
  gender                         text check (gender in ('female', 'male', 'other', 'unspecified')),
  birth_date                     date check (birth_date > date '1900-01-01'),
  phone                          text check (char_length(phone) <= 30),
  blood_type                     text check (blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  occupation                     text check (char_length(occupation) <= 120),
  sports_experience              text check (char_length(sports_experience) <= 500),
  emergency_contact_name         text check (char_length(emergency_contact_name) <= 120),
  emergency_contact_relationship text check (char_length(emergency_contact_relationship) <= 60),
  emergency_contact_phone        text check (char_length(emergency_contact_phone) <= 30),
  weekly_frequency_days          smallint check (weekly_frequency_days between 0 and 14),
  session_duration_min           smallint check (session_duration_min between 5 and 600),
  join_date                      date not null default ((now() at time zone 'America/Costa_Rica')::date),
  invited_at                     timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  created_by_staff               uuid references public.staff (id) on delete set null,
  updated_by_staff               uuid references public.staff (id) on delete set null
);
create unique index if not exists clients_email_key on public.clients (email) where email is not null;
create index if not exists clients_sede_name_idx on public.clients (sede_id, full_name);
comment on table public.clients is
  'The client file, owned by the sede. Walk-ins have user_id NULL. Age is computed from birth_date, never stored.';

-- 2. Clinical history and objectives: one row per version, never edited ---------
create table if not exists public.client_clinical_history (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients (id) on delete cascade,
  goals                text[] not null default '{}'
                         check (goals <@ array['muscle_gain','fat_loss','fitness','health']::text[]),
  pathological_history text check (char_length(pathological_history) <= 2000),
  medications          text check (char_length(medications) <= 2000),
  sports_injuries      text check (char_length(sports_injuries) <= 2000),
  excluded_exercises   text check (char_length(excluded_exercises) <= 2000),
  created_at           timestamptz not null default now(),
  created_by_staff     uuid references public.staff (id) on delete set null
);
create index if not exists client_clinical_history_client_idx
  on public.client_clinical_history (client_id, created_at desc);
comment on table public.client_clinical_history is
  'Restricted health data. Append-only. Never join it into lists, search or exports.';

-- 3. Evaluation: one row per measurement session, raw values only ----------------
create table if not exists public.client_measurements (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  measured_on       date not null default ((now() at time zone 'America/Costa_Rica')::date),
  measured_by_staff uuid references public.staff (id) on delete set null,
  -- Copied at insert: a client can't read public.staff, and the sheet shows the coach.
  measured_by_name  text,
  height_cm         numeric(5,1) not null check (height_cm between 50 and 260),
  weight_kg         numeric(5,1) not null check (weight_kg between 10 and 500),
  muscle_kg         numeric(5,1) check (muscle_kg >= 0 and muscle_kg <= weight_kg),
  fat_kg            numeric(5,1) check (fat_kg >= 0 and fat_kg <= weight_kg),
  body_water_pct    numeric(4,1) check (body_water_pct between 0 and 100),
  target_weight_kg  numeric(5,1) check (target_weight_kg between 10 and 500),
  target_fat_pct    numeric(4,1) check (target_fat_pct between 0 and 100),
  target_muscle_pct numeric(4,1) check (target_muscle_pct between 0 and 100),
  chest_cm          numeric(4,1) check (chest_cm between 10 and 300),
  arm_right_cm      numeric(4,1) check (arm_right_cm between 5 and 300),
  arm_left_cm       numeric(4,1) check (arm_left_cm between 5 and 300),
  waist_cm          numeric(4,1) check (waist_cm between 10 and 300),
  umbilical_cm      numeric(4,1) check (umbilical_cm between 10 and 300),
  hip_cm            numeric(4,1) check (hip_cm between 10 and 300),
  thigh_right_cm    numeric(4,1) check (thigh_right_cm between 5 and 300),
  thigh_left_cm     numeric(4,1) check (thigh_left_cm between 5 and 300),
  calf_right_cm     numeric(4,1) check (calf_right_cm between 5 and 300),
  calf_left_cm      numeric(4,1) check (calf_left_cm between 5 and 300),
  observations      text check (char_length(observations) <= 2000),
  metabolic_age     smallint check (metabolic_age between 1 and 130),
  health_score      smallint check (health_score between 0 and 100),
  override_reason   text check (char_length(override_reason) <= 500),
  override_by_staff uuid references public.staff (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by_staff  uuid references public.staff (id) on delete set null,
  updated_by_staff  uuid references public.staff (id) on delete set null,
  -- Also the index for "this client's sessions by date".
  constraint client_measurements_client_day_key unique (client_id, measured_on)
);
comment on table public.client_measurements is
  'Raw values only: percentages, waist/hip, BMI and age are computed on read.';

-- 4. Interval setting --------------------------------------------------------------
insert into public.app_settings (key, value, label)
values ('measurements.interval_days', '30', 'Días mínimos entre una medición y la siguiente')
on conflict (key) do nothing;

alter table public.app_settings drop constraint if exists app_settings_measurement_rules_check;
alter table public.app_settings add constraint app_settings_measurement_rules_check check (
  case
    when key <> 'measurements.interval_days' then true
    when jsonb_typeof(value) <> 'number' then false
    when (value #>> '{}') !~ '^[0-9]{1,3}$' then false
    else (value #>> '{}')::integer between 1 and 365
  end
);

-- 5. Helpers -----------------------------------------------------------------------
-- The acting employee holds p_permission AND works in this client's sede.
-- EXISTS / CASE never return NULL, so callers can safely write IF NOT.
create or replace function public.staff_can_client(p_permission text, p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.staff_can(p_permission), false) and exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.sede_id in (select public.staff_sede_ids())
  );
$$;

-- The client file of the signed-in client, while their access is on.
create or replace function public.own_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select c.id
  from public.clients c
  join public.profiles p on p.id = c.user_id
  where c.user_id = (select auth.uid())
    and p.role::text = 'client'
    and p.authorized;
$$;

-- 6. Triggers ----------------------------------------------------------------------
create or replace function public.guard_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The email is the login's identity: once linked it can't drift from it.
  if (select auth.uid()) is not null
     and old.user_id is not null
     and new.email is distinct from old.email then
    raise exception 'EMAIL_LOCKED' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_client_update on public.clients;
create trigger guard_client_update before update on public.clients
  for each row execute function public.guard_client_update();

drop trigger if exists stamp_staff_audit on public.clients;
create trigger stamp_staff_audit before insert or update on public.clients
  for each row execute function public.stamp_staff_audit();

create or replace function public.stamp_clinical_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by_staff := public.current_staff_id();
  new.created_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists stamp_clinical_author on public.client_clinical_history;
create trigger stamp_clinical_author before insert on public.client_clinical_history
  for each row execute function public.stamp_clinical_author();

create or replace function public.guard_client_measurement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := public.current_staff_id();
begin
  -- BEFORE triggers run ahead of RLS: check first, so the interval error can't
  -- be used to probe another client's dates.
  if (select auth.uid()) is not null
     and not coalesce(public.staff_can_client('measurements.write', new.client_id), false) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;

  if new.measured_on > (now() at time zone 'America/Costa_Rica')::date then
    raise exception 'MEASUREMENT_FUTURE' using errcode = '22023';
  end if;

  -- One at a time per client, or two desks could both pass the interval check.
  perform pg_advisory_xact_lock(hashtextextended(new.client_id::text, 0));

  new.measured_by_staff := v_staff;
  new.measured_by_name := (select full_name from public.staff where id = v_staff);
  new.override_reason := nullif(btrim(new.override_reason), '');
  new.override_by_staff := null;

  if exists (
    select 1 from public.client_measurements m
    where m.client_id = new.client_id
      and abs(m.measured_on - new.measured_on) < public.setting_int('measurements.interval_days', 30)
  ) then
    if new.override_reason is null then
      raise exception 'MEASUREMENT_INTERVAL' using errcode = '22023';
    end if;
    if not coalesce(public.staff_can('measurements.override'), false) then
      raise exception 'OVERRIDE_NOT_ALLOWED' using errcode = '42501';
    end if;
    new.override_by_staff := v_staff;
  else
    new.override_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_client_measurement on public.client_measurements;
create trigger guard_client_measurement before insert on public.client_measurements
  for each row execute function public.guard_client_measurement();

drop trigger if exists stamp_staff_audit on public.client_measurements;
create trigger stamp_staff_audit before insert or update on public.client_measurements
  for each row execute function public.stamp_staff_audit();

-- 7. RLS ---------------------------------------------------------------------------
alter table public.clients                 enable row level security;
alter table public.client_clinical_history enable row level security;
alter table public.client_measurements     enable row level security;

drop policy if exists "staff or self reads client" on public.clients;
create policy "staff or self reads client" on public.clients for select to authenticated
  using (
    ((select public.staff_can('clients.read')) and sede_id in (select public.staff_sede_ids()))
    or id = (select public.own_client_id())
  );
drop policy if exists "staff creates clients" on public.clients;
create policy "staff creates clients" on public.clients for insert to authenticated
  with check ((select public.staff_can('clients.write')) and sede_id in (select public.staff_sede_ids()));
drop policy if exists "staff edits clients" on public.clients;
create policy "staff edits clients" on public.clients for update to authenticated
  using ((select public.staff_can('clients.write')) and sede_id in (select public.staff_sede_ids()))
  with check ((select public.staff_can('clients.write')) and sede_id in (select public.staff_sede_ids()));

drop policy if exists "staff or self reads history" on public.client_clinical_history;
create policy "staff or self reads history" on public.client_clinical_history for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('clinical.read', client_id));
drop policy if exists "staff adds history version" on public.client_clinical_history;
create policy "staff adds history version" on public.client_clinical_history for insert to authenticated
  with check (public.staff_can_client('clinical.write', client_id));

drop policy if exists "staff or self reads measurements" on public.client_measurements;
create policy "staff or self reads measurements" on public.client_measurements for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('clients.read', client_id));
drop policy if exists "staff records measurements" on public.client_measurements;
create policy "staff records measurements" on public.client_measurements for insert to authenticated
  with check (public.staff_can_client('measurements.write', client_id));
drop policy if exists "staff corrects measurements" on public.client_measurements;
create policy "staff corrects measurements" on public.client_measurements for update to authenticated
  using (public.staff_can_client('measurements.write', client_id))
  with check (public.staff_can_client('measurements.write', client_id));

-- 8. Grants: from zero, per column (default privileges give ALL, see 0023) ----------
revoke all on public.clients, public.client_clinical_history, public.client_measurements
  from public, anon, authenticated;

grant select on public.clients, public.client_clinical_history, public.client_measurements to authenticated;

grant insert (sede_id, full_name, email, national_id, address, gender, birth_date, phone, blood_type,
  occupation, sports_experience, emergency_contact_name, emergency_contact_relationship,
  emergency_contact_phone, weekly_frequency_days, session_duration_min, join_date)
  on public.clients to authenticated;
grant update (sede_id, full_name, email, national_id, address, gender, birth_date, phone, blood_type,
  occupation, sports_experience, emergency_contact_name, emergency_contact_relationship,
  emergency_contact_phone, weekly_frequency_days, session_duration_min, join_date)
  on public.clients to authenticated;

grant insert (client_id, goals, pathological_history, medications, sports_injuries, excluded_exercises)
  on public.client_clinical_history to authenticated;

grant insert (client_id, measured_on, height_cm, weight_kg, muscle_kg, fat_kg, body_water_pct,
  target_weight_kg, target_fat_pct, target_muscle_pct, chest_cm, arm_right_cm, arm_left_cm, waist_cm,
  umbilical_cm, hip_cm, thigh_right_cm, thigh_left_cm, calf_right_cm, calf_left_cm, observations,
  metabolic_age, health_score, override_reason)
  on public.client_measurements to authenticated;
-- Correcting a typo: never the client, the date, the coach or the override.
grant update (height_cm, weight_kg, muscle_kg, fat_kg, body_water_pct,
  target_weight_kg, target_fat_pct, target_muscle_pct, chest_cm, arm_right_cm, arm_left_cm, waist_cm,
  umbilical_cm, hip_cm, thigh_right_cm, thigh_left_cm, calf_right_cm, calf_left_cm, observations,
  metabolic_age, health_score)
  on public.client_measurements to authenticated;

grant all on public.clients, public.client_clinical_history, public.client_measurements to service_role;

-- 9. Function privileges (new ones, plus the helpers 0023 left open to anon) ---------
revoke execute on function
  public.staff_can_client(text, uuid), public.own_client_id(),
  public.is_desk(), public.desk_sede_ids(), public.setting_int(text, integer),
  public.staff_token_hash(), public.current_staff_id(), public.staff_sede_ids(),
  public.staff_can(text), public.staff_manageable(uuid)
  from public, anon;
grant execute on function
  public.staff_can_client(text, uuid), public.own_client_id(),
  public.is_desk(), public.desk_sede_ids(), public.setting_int(text, integer),
  public.staff_token_hash(), public.current_staff_id(), public.staff_sede_ids(),
  public.staff_can(text), public.staff_manageable(uuid)
  to authenticated, service_role;

-- Trigger functions are never called directly.
revoke execute on function
  public.stamp_staff_audit(), public.stamp_setting_audit(), public.stamp_clinical_author(),
  public.guard_client_update(), public.guard_client_measurement()
  from public, anon, authenticated;

$mig$;
execute $tests$

create function public.dryrun_check(p_name text, p_sql text, p_expected text) returns text
language plpgsql as $c$
declare n integer; got text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception 'ok:%', n;  -- undo whatever the statement changed
  exception when others then got := sqlerrm;
  end;
  if got like p_expected then return null; end if;
  return p_name || ' => ' || got;
end $c$;
grant execute on function public.dryrun_check(text, text, text) to anon, authenticated;

do $t$
declare
  desk_id uuid; desk text; hoy date := (now() at time zone 'America/Costa_Rica')::date;
  a uuid; c uuid; x uuid; u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); j1 text; j2 text;
  k1 uuid; k2 uuid; k3 uuid; m1 uuid; who uuid; nm text; f text[] := '{}';
  ha text; hc text; hx text;
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;
  j1 := json_build_object('sub', u1, 'role', 'authenticated')::text;
  j2 := json_build_object('sub', u2, 'role', 'authenticated')::text;

  -- test staff and sessions, written as postgres (all rolled back)
  insert into public.staff (full_name, role_id) values ('DEMO Admin', 'admin') returning id into a;
  insert into public.staff (full_name, role_id) values ('DEMO Coach', 'coach') returning id into c;
  insert into public.staff (full_name, role_id) values ('DEMO Cafe', 'coach') returning id into x;
  insert into public.staff_sedes values (a,'bellavista'),(a,'cafe'),(c,'bellavista'),(x,'cafe');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at) values
    (encode(extensions.digest('dry-admin','sha256'),'hex'), a, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('dry-coach','sha256'),'hex'), c, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('dry-cafe','sha256'),'hex'),  x, desk_id, now() + interval '5 minutes');
  ha := '{"x-staff-token":"dry-admin"}'; hc := '{"x-staff-token":"dry-coach"}'; hx := '{"x-staff-token":"dry-cafe"}';
  insert into public.profiles (id, full_name, role, authorized) values
    (u1, 'DEMO Cliente 1', 'client', true), (u2, 'DEMO Cliente 2', 'client', true);

  -- coach of bellavista
  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', hc, true);
  execute 'set local role authenticated';
  insert into public.clients (sede_id, full_name, email, gender, emergency_contact_relationship)
    values ('bellavista', 'DEMO Uno', 'dryrun.uno@example.com', 'male', 'DEMO') returning id into k1;
  insert into public.clients (sede_id, full_name) values ('bellavista', 'DEMO Dos') returning id into k2;
  f := f || public.dryrun_check('coach creates in cafe', $q$insert into public.clients (sede_id, full_name) values ('cafe', 'DEMO X')$q$, '%row-level security%');
  f := f || public.dryrun_check('coach moves to cafe', format($q$update public.clients set sede_id = 'cafe' where id = %L$q$, k1), '%row-level security%');
  f := f || public.dryrun_check('coach links a login', format($q$update public.clients set user_id = %L where id = %L$q$, u1, k1), '%permission denied%');
  f := f || public.dryrun_check('coach forges creator', format($q$update public.clients set created_by_staff = %L where id = %L$q$, a, k1), '%permission denied%');
  f := f || public.dryrun_check('duplicate email', $q$insert into public.clients (sede_id, full_name, email) values ('bellavista', 'DEMO X', 'dryrun.uno@example.com')$q$, '%clients_email_key%');
  f := f || public.dryrun_check('uppercase email', $q$insert into public.clients (sede_id, full_name, email) values ('bellavista', 'DEMO X', 'X@Example.com')$q$, '%check constraint%');
  f := f || public.dryrun_check('coach edits client', format($q$update public.clients set phone = '88880000' where id = %L returning id$q$, k1), 'ok:1');
  f := f || public.dryrun_check('coach deletes client', format($q$delete from public.clients where id = %L$q$, k1), '%permission denied%');
  select created_by_staff into who from public.clients where id = k1;
  if who is distinct from c then f := f || 'client creator not stamped'::text; end if;

  insert into public.client_clinical_history (client_id, goals, medications) values (k1, '{muscle_gain,health}', 'DEMO');
  f := f || public.dryrun_check('history edited', $q$update public.client_clinical_history set medications = 'x'$q$, '%permission denied%');
  f := f || public.dryrun_check('history deleted', $q$delete from public.client_clinical_history$q$, '%permission denied%');
  f := f || public.dryrun_check('unknown goal', format($q$insert into public.client_clinical_history (client_id, goals) values (%L, '{fly}')$q$, k1), '%check constraint%');
  f := f || public.dryrun_check('history second version', format($q$insert into public.client_clinical_history (client_id) values (%L)$q$, k1), 'ok:1');
  select created_by_staff into who from public.client_clinical_history where client_id = k1;
  if who is distinct from c then f := f || 'history author not stamped'::text; end if;

  insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg, muscle_kg, fat_kg, body_water_pct,
      target_weight_kg, target_fat_pct, target_muscle_pct, chest_cm, arm_right_cm, arm_left_cm, waist_cm, umbilical_cm, hip_cm,
      thigh_right_cm, thigh_left_cm, calf_right_cm, calf_left_cm, observations, metabolic_age, health_score)
    values (k1, hoy - 40, 170, 70, 30, 14, 55, 68, 18, 44, 100, 30, 30, 80, 82, 100, 55, 55, 35, 35, 'DEMO', 30, 70)
    returning id into m1;
  select measured_by_staff, measured_by_name into who, nm from public.client_measurements where id = m1;
  if who is distinct from c or nm is distinct from 'DEMO Coach' then f := f || 'coach not stamped'::text; end if;
  f := f || public.dryrun_check('after interval', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k1, hoy), 'ok:1');
  f := f || public.dryrun_check('day 30 is allowed', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k1, hoy - 10), 'ok:1');
  f := f || public.dryrun_check('inside interval', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k1, hoy - 11), 'MEASUREMENT_INTERVAL');
  f := f || public.dryrun_check('backdated inside interval', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k1, hoy - 45), 'MEASUREMENT_INTERVAL');
  f := f || public.dryrun_check('coach overrides', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg, override_reason) values (%L, %L, 170, 69, 'x')$q$, k1, hoy - 30), 'OVERRIDE_NOT_ALLOWED');
  f := f || public.dryrun_check('future date', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k2, hoy + 1), 'MEASUREMENT_FUTURE');
  f := f || public.dryrun_check('fat over weight', format($q$insert into public.client_measurements (client_id, height_cm, weight_kg, fat_kg) values (%L, 170, 70, 71)$q$, k2), '%check constraint%');
  f := f || public.dryrun_check('forged coach', format($q$insert into public.client_measurements (client_id, height_cm, weight_kg, measured_by_staff) values (%L, 170, 70, %L)$q$, k2, a), '%permission denied%');
  f := f || public.dryrun_check('typo fixed', format($q$update public.client_measurements set weight_kg = 69.5 where id = %L returning id$q$, m1), 'ok:1');
  f := f || public.dryrun_check('date changed', format($q$update public.client_measurements set measured_on = %L where id = %L$q$, hoy, m1), '%permission denied%');
  f := f || public.dryrun_check('coach name changed', format($q$update public.client_measurements set measured_by_name = 'Otro' where id = %L$q$, m1), '%permission denied%');
  f := f || public.dryrun_check('measurement deleted', format($q$delete from public.client_measurements where id = %L$q$, m1), '%permission denied%');
  f := f || public.dryrun_check('coach changes interval', $q$update public.app_settings set value = '1' where key = 'measurements.interval_days'$q$, 'ok:0');

  -- admin of both sedes
  perform set_config('request.headers', ha, true);
  insert into public.clients (sede_id, full_name) values ('cafe', 'DEMO Tres') returning id into k3;
  f := f || public.dryrun_check('admin overrides', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg, override_reason) values (%L, %L, 170, 69, 'motivo')$q$, k1, hoy - 30), 'ok:1');
  f := f || public.dryrun_check('override same day', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg, override_reason) values (%L, %L, 170, 69, 'motivo')$q$, k1, hoy - 40), '%client_day_key%');
  f := f || public.dryrun_check('interval zero', $q$update public.app_settings set value = '0' where key = 'measurements.interval_days'$q$, '%measurement_rules_check%');
  f := f || public.dryrun_check('interval valid', $q$update public.app_settings set value = '28' where key = 'measurements.interval_days' returning key$q$, 'ok:1');
  f := f || public.dryrun_check('admin sees both sedes', format($q$select 1 from public.clients where id in (%L, %L)$q$, k1, k3), 'ok:2');
  insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (k2, hoy, 170, 60);
  insert into public.client_clinical_history (client_id, medications) values (k2, 'DEMO privado');

  -- coach of cafe
  perform set_config('request.headers', hx, true);
  f := f || public.dryrun_check('other sede reads client', format($q$select 1 from public.clients where id = %L$q$, k1), 'ok:0');
  f := f || public.dryrun_check('other sede reads history', format($q$select 1 from public.client_clinical_history where client_id = %L$q$, k1), 'ok:0');
  f := f || public.dryrun_check('other sede reads measurements', format($q$select 1 from public.client_measurements where client_id = %L$q$, k1), 'ok:0');
  f := f || public.dryrun_check('other sede edits client', format($q$update public.clients set phone = '1' where id = %L$q$, k1), 'ok:0');
  f := f || public.dryrun_check('other sede edits measurement', format($q$update public.client_measurements set weight_kg = 50 where id = %L$q$, m1), 'ok:0');
  f := f || public.dryrun_check('other sede writes history', format($q$insert into public.client_clinical_history (client_id) values (%L)$q$, k1), '%row-level security%');
  f := f || public.dryrun_check('other sede probes dates', format($q$insert into public.client_measurements (client_id, measured_on, height_cm, weight_kg) values (%L, %L, 170, 69)$q$, k1, hoy - 40), 'NOT_ALLOWED');

  -- locked desk
  perform set_config('request.headers', '{}', true);
  f := f || public.dryrun_check('locked reads clients', $q$select 1 from public.clients$q$, 'ok:0');
  f := f || public.dryrun_check('locked reads history', $q$select 1 from public.client_clinical_history$q$, 'ok:0');
  f := f || public.dryrun_check('locked reads measurements', $q$select 1 from public.client_measurements$q$, 'ok:0');
  f := f || public.dryrun_check('locked creates client', $q$insert into public.clients (sede_id, full_name) values ('bellavista', 'DEMO X')$q$, '%row-level security%');
  f := f || public.dryrun_check('locked measures', format($q$insert into public.client_measurements (client_id, height_cm, weight_kg) values (%L, 170, 69)$q$, k2), 'NOT_ALLOWED');

  -- link the logins, as the server does
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
  update public.clients set user_id = u1 where id = k1;
  update public.clients set user_id = u2 where id = k3;
  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', hc, true);
  execute 'set local role authenticated';
  f := f || public.dryrun_check('linked email changed', format($q$update public.clients set email = 'otro@example.com' where id = %L$q$, k1), 'EMAIL_LOCKED');

  -- client 1
  perform set_config('request.jwt.claims', j1, true);
  perform set_config('request.headers', '{}', true);
  f := f || public.dryrun_check('client reads only own file', $q$select 1 from public.clients$q$, 'ok:1');
  f := f || public.dryrun_check('client reads only own history', $q$select 1 from public.client_clinical_history$q$, 'ok:1');
  f := f || public.dryrun_check('client reads only own measurements', $q$select 1 from public.client_measurements$q$, 'ok:1');
  f := f || public.dryrun_check('client reads someone else', format($q$select 1 from public.client_clinical_history where client_id = %L$q$, k2), 'ok:0');
  f := f || public.dryrun_check('client changes sede', $q$update public.clients set sede_id = 'cafe'$q$, 'ok:0');
  f := f || public.dryrun_check('client changes join date', $q$update public.clients set join_date = '2020-01-01'$q$, 'ok:0');
  f := f || public.dryrun_check('client edits measurement', $q$update public.client_measurements set weight_kg = 50$q$, 'ok:0');
  f := f || public.dryrun_check('client measures', format($q$insert into public.client_measurements (client_id, height_cm, weight_kg) values (%L, 170, 69)$q$, k1), 'NOT_ALLOWED');
  f := f || public.dryrun_check('client writes history', format($q$insert into public.client_clinical_history (client_id) values (%L)$q$, k1), '%row-level security%');
  f := f || public.dryrun_check('client creates file', $q$insert into public.clients (sede_id, full_name) values ('bellavista', 'DEMO X')$q$, '%row-level security%');
  perform set_config('request.headers', hc, true);
  f := f || public.dryrun_check('client with a stolen token', format($q$select 1 from public.clients where id = %L$q$, k2), 'ok:0');

  -- suspended client
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('request.headers', '{}', true);
  update public.profiles set authorized = false where id = u2;
  perform set_config('request.jwt.claims', j2, true);
  execute 'set local role authenticated';
  f := f || public.dryrun_check('suspended client reads', $q$select 1 from public.clients$q$, 'ok:0');

  -- anon
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  f := f || public.dryrun_check('anon reads clients', $q$select 1 from public.clients$q$, '%permission denied%');
  f := f || public.dryrun_check('anon reads history', $q$select 1 from public.client_clinical_history$q$, '%permission denied%');
  f := f || public.dryrun_check('anon reads measurements', $q$select 1 from public.client_measurements$q$, '%permission denied%');
  f := f || public.dryrun_check('anon calls setting_int', $q$select public.setting_int('staff.idle_minutes', 0)$q$, '%permission denied%');
  f := f || public.dryrun_check('anon calls staff_can', $q$select public.staff_can('clients.read')$q$, '%permission denied%');
  f := f || public.dryrun_check('anon still reads sedes', $q$select 1 from public.sedes$q$, 'ok:2');
  execute 'reset role';

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'DRYRUN_OK: todas las pruebas de la 0024 pasaron'; end if;
  raise exception 'DRYRUN_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;

$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'DRYRUN_ABORT: sin resultado');
end
$dry$;
