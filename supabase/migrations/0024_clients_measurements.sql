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
