-- PRUEBA 2 de la migración 0023 (57 casos). NO es una migración y NO guarda nada.
-- Migración probada: sha256 9e69aef86fe809449f8111d0df83965cd66961e439b8dec5fa4a79b27d29c10f
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
-- 0023: sedes, settings, staff, roles/permissions and the PIN desk session.
--
-- MODEL (design/internal/SISTEMA-INTERNO.md §0b, PROGRESS.md A1–A4)
--   * Clients sign in as themselves (unchanged).
--   * Staff never sign in individually. A desk computer is signed in as a
--     DESK ACCOUNT (profiles.role = 'desk'; legacy 'admin' auth accounts act as
--     desks too), bound to one or more sedes (desk_sedes).
--   * A staff member (public.staff, not an auth user) picks their name on the
--     desk and types a 4-digit PIN. staff_unlock() checks it and opens a
--     staff_sessions row. The app keeps the random token in an httpOnly cookie
--     and forwards it on every request as the `x-staff-token` header; RLS reads
--     it through current_staff_id(). Only the token's SHA-256 is stored.
--   * Permissions: staff.role_id → staff_role_permissions. Policies ask
--     staff_can('<permission>'), never "role = admin". Payroll is the per-person
--     flag staff.can_manage_payroll (permission 'payroll.manage').
--
-- Additive only. Idempotent.

-- 1. Desk role ---------------------------------------------------------------
-- New enum values can't be used in the transaction that adds them, so every
-- comparison below goes through role::text.
alter type public.user_role add value if not exists 'desk';

-- 2. Sedes -------------------------------------------------------------------
create table if not exists public.sedes (
  id                text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name              text not null check (char_length(btrim(name)) between 2 and 80),
  address           text,
  building_capacity integer not null check (building_capacity > 0),
  status            text not null default 'open' check (status in ('open', 'coming_soon')),
  -- {"mon":[["06:00","21:00"]], …, "sun":[]} — 24h local time (America/Costa_Rica).
  opening_hours     jsonb not null default '{}'::jsonb,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.sedes is 'ticofit locations. Names and hours are editable settings, not code.';

insert into public.sedes (id, name, address, building_capacity, status, opening_hours, sort_order)
values
  ('bellavista', 'ticofit parque bellavista', 'Rohrmoser, San José', 25, 'open',
   '{"mon":[["06:00","21:00"]],"tue":[["06:00","21:00"]],"wed":[["06:00","21:00"]],"thu":[["06:00","21:00"]],"fri":[["06:00","21:00"]],"sat":[["08:00","12:00"]],"sun":[]}', 1),
  ('cafe', 'ticofit parque del café', null, 50, 'coming_soon',
   '{"mon":[["06:00","21:00"]],"tue":[["06:00","21:00"]],"wed":[["06:00","21:00"]],"thu":[["06:00","21:00"]],"fri":[["06:00","21:00"]],"sat":[["08:00","12:00"]],"sun":[]}', 2)
on conflict (id) do nothing;

-- 3. Settings ------------------------------------------------------------------
create table if not exists public.app_settings (
  key              text primary key check (key ~ '^[a-z0-9_.]+$'),
  value            jsonb not null,
  label            text not null,
  updated_at       timestamptz not null default now(),
  updated_by_staff uuid
);
comment on table public.app_settings is 'Business rules that are settings, not code (idle lock, grace period, cutoffs…).';

insert into public.app_settings (key, value, label) values
  ('staff.idle_minutes',     '10', 'Minutos sin actividad antes de bloquear la sesión del personal'),
  ('staff.pin_max_attempts', '5',  'Intentos de PIN antes de bloquear'),
  ('staff.pin_lock_minutes', '15', 'Minutos de bloqueo tras demasiados intentos')
on conflict (key) do nothing;

-- The PIN rules are a security control: without bounds, an admin could raise the
-- attempt limit and guess a payroll holder's PIN.
alter table public.app_settings drop constraint if exists app_settings_pin_rules_check;
alter table public.app_settings add constraint app_settings_pin_rules_check check (
  case
    when key not in ('staff.idle_minutes', 'staff.pin_max_attempts', 'staff.pin_lock_minutes') then true
    when jsonb_typeof(value) <> 'number' then false
    when (value #>> '{}') !~ '^[0-9]{1,4}$' then false
    when key = 'staff.idle_minutes' then (value #>> '{}')::integer between 1 and 120
    when key = 'staff.pin_max_attempts' then (value #>> '{}')::integer between 3 and 10
    else (value #>> '{}')::integer between 5 and 1440
  end
);

-- 4. Roles & permissions -------------------------------------------------------
create table if not exists public.staff_roles (
  id         text primary key check (id ~ '^[a-z_]{2,30}$'),
  label      text not null,
  sort_order integer not null default 0
);

create table if not exists public.staff_permissions (
  id    text primary key check (id ~ '^[a-z_]+\.[a-z_]+$'),
  label text not null
);

create table if not exists public.staff_role_permissions (
  role_id       text not null references public.staff_roles (id) on delete cascade,
  permission_id text not null references public.staff_permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);
create index if not exists staff_role_permissions_permission_idx
  on public.staff_role_permissions (permission_id);

insert into public.staff_roles (id, label, sort_order) values
  ('admin', 'Administrador', 1),
  ('coach', 'Coach', 2)
on conflict (id) do nothing;

insert into public.staff_permissions (id, label) values
  ('clients.read',         'Ver clientes'),
  ('clients.write',        'Crear y editar clientes'),
  ('clinical.read',        'Ver historia clínica'),
  ('clinical.write',       'Editar historia clínica'),
  ('measurements.write',   'Registrar mediciones'),
  ('measurements.override','Registrar una medición fuera del intervalo'),
  ('routines.write',       'Crear y asignar rutinas'),
  ('exercises.write',      'Agregar ejercicios a la biblioteca'),
  ('payments.review',      'Aprobar o rechazar comprobantes'),
  ('payments.cash',        'Registrar pagos en efectivo'),
  ('memberships.write',    'Asignar planes y reactivar membresías'),
  ('schedule.write',       'Editar clases y horarios'),
  ('reservations.write',   'Reservar y cancelar por un cliente; marcar asistencia'),
  ('employees.manage',     'Gestionar personal y PINs'),
  ('settings.manage',      'Editar sedes, salones, planes y ajustes'),
  ('attendance.manage',    'Corregir marcas del reloj'),
  ('payroll.manage',       'Ver salarios y hacer planillas')
on conflict (id) do nothing;

-- admin: everything except payroll (that one is the per-person flag).
insert into public.staff_role_permissions (role_id, permission_id)
select 'admin', id from public.staff_permissions where id <> 'payroll.manage'
on conflict do nothing;

-- coach: day-to-day work with clients. No settings, staff or payroll.
insert into public.staff_role_permissions (role_id, permission_id)
select 'coach', id from public.staff_permissions
where id in ('clients.read','clients.write','clinical.read','clinical.write',
             'measurements.write','routines.write','exercises.write',
             'payments.review','payments.cash','memberships.write',
             'reservations.write')
on conflict do nothing;

-- 5. Staff ------------------------------------------------------------------
create table if not exists public.staff (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null check (char_length(btrim(full_name)) between 2 and 120),
  role_id            text not null references public.staff_roles (id),
  can_manage_payroll boolean not null default false,
  phone              text,
  email              text,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by_staff   uuid references public.staff (id) on delete set null,
  updated_by_staff   uuid references public.staff (id) on delete set null
);
create index if not exists staff_role_idx on public.staff (role_id);
comment on table public.staff is 'People who work at ticofit. Not auth users: they act on a desk account with their PIN.';

create table if not exists public.staff_sedes (
  staff_id uuid not null references public.staff (id) on delete cascade,
  sede_id  text not null references public.sedes (id) on delete cascade,
  primary key (staff_id, sede_id)
);
create index if not exists staff_sedes_sede_idx on public.staff_sedes (sede_id);

-- PIN material lives apart from staff so no policy can ever expose it.
create table if not exists public.staff_pins (
  staff_id        uuid primary key references public.staff (id) on delete cascade,
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

-- 6. Desk accounts ------------------------------------------------------------
create table if not exists public.desk_sedes (
  desk_id uuid not null references public.profiles (id) on delete cascade,
  sede_id text not null references public.sedes (id) on delete cascade,
  primary key (desk_id, sede_id)
);
create index if not exists desk_sedes_sede_idx on public.desk_sedes (sede_id);

-- Legacy admin auth accounts become desks for both sedes.
insert into public.desk_sedes (desk_id, sede_id)
select p.id, s.id from public.profiles p cross join public.sedes s
where p.role::text = 'admin'
on conflict do nothing;

-- Desk accounts are pre-authorized like everyone else (invite-only, 0010).
-- Clients no longer need an owning coach: the sede owns them (0024).
alter table public.preauthorized_emails drop constraint if exists preauthorized_emails_shape_check;
alter table public.preauthorized_emails add constraint preauthorized_emails_shape_check check (
  intended_role::text = 'client'
  or (intended_role::text in ('coach', 'admin', 'desk') and coach_id is null)
);

-- 7. Staff sessions -----------------------------------------------------------
create table if not exists public.staff_sessions (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  staff_id     uuid not null references public.staff (id) on delete cascade,
  desk_id      uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  ended_at     timestamptz
);
create index if not exists staff_sessions_staff_idx on public.staff_sessions (staff_id);
create index if not exists staff_sessions_desk_open_idx on public.staff_sessions (desk_id) where ended_at is null;

-- 8. Helper functions -------------------------------------------------------------
create or replace function public.is_desk()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role::text in ('desk', 'admin')
      and authorized
  );
$$;

create or replace function public.desk_sede_ids()
returns setof text
language sql
security definer
set search_path = public
stable
as $$
  select ds.sede_id from public.desk_sedes ds
  where ds.desk_id = (select auth.uid())
    and public.is_desk();
$$;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_settings where key = p_key), p_default);
$$;

create or replace function public.staff_token_hash()
returns text
language sql
stable
set search_path = public
as $$
  select encode(extensions.digest(
    nullif(current_setting('request.headers', true)::json ->> 'x-staff-token', ''), 'sha256'), 'hex');
$$;

-- The employee acting right now on this desk, or NULL.
create or replace function public.current_staff_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select s.staff_id
  from public.staff_sessions s
  join public.staff st on st.id = s.staff_id and st.active
  where s.token_hash = public.staff_token_hash()
    and s.desk_id = (select auth.uid())
    and s.ended_at is null
    and s.expires_at > now()
    and public.is_desk()  -- a disabled desk loses every permission immediately
  limit 1;
$$;

-- Sedes the acting employee may work in on this desk: theirs ∩ the desk's.
create or replace function public.staff_sede_ids()
returns setof text
language sql
security definer
set search_path = public
stable
as $$
  select ss.sede_id
  from public.staff_sedes ss
  where ss.staff_id = public.current_staff_id()
    and ss.sede_id in (select public.desk_sede_ids());
$$;

create or replace function public.staff_can(p_permission text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when p_permission = 'payroll.manage' then exists (
      select 1 from public.staff where id = public.current_staff_id() and can_manage_payroll)
    else exists (
      select 1 from public.staff st
      join public.staff_role_permissions rp on rp.role_id = st.role_id
      where st.id = public.current_staff_id() and rp.permission_id = p_permission)
  end;
$$;

-- May the acting employee administer this person? Needs employees.manage and a
-- shared sede (so nobody can pull staff in from another sede). A payroll holder
-- can only be administered by another payroll holder: otherwise an admin could
-- reset their PIN, revoke their flag or deactivate them.
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
  );
$$;

create or replace function public.stamp_setting_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by_staff := public.current_staff_id();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_setting_audit on public.app_settings;
create trigger stamp_setting_audit before update on public.app_settings
  for each row execute function public.stamp_setting_audit();

-- Audit columns come from the PIN session, never from the request body.
create or replace function public.stamp_staff_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := public.current_staff_id();
begin
  if tg_op = 'INSERT' then
    if v_staff is not null or (select auth.role()) <> 'service_role' then
      new.created_by_staff := v_staff;
    end if;
  end if;
  if v_staff is not null or (select auth.role()) <> 'service_role' then
    new.updated_by_staff := v_staff;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_staff_audit on public.staff;
create trigger stamp_staff_audit before insert or update on public.staff
  for each row execute function public.stamp_staff_audit();

drop trigger if exists touch_sedes on public.sedes;
create trigger touch_sedes before update on public.sedes
  for each row execute function public.touch_updated_at();

-- 9. Desk RPCs ------------------------------------------------------------------
-- Names for the unlock screen: active staff of this desk's sedes.
create or replace function public.desk_staff_list()
returns table (id uuid, full_name text, role_label text, has_pin boolean)
language sql
security definer
set search_path = public
stable
as $$
  select st.id, st.full_name, r.label, exists (select 1 from public.staff_pins p where p.staff_id = st.id)
  from public.staff st
  join public.staff_roles r on r.id = st.role_id
  where st.active
    and exists (select 1 from public.staff_sedes ss
                where ss.staff_id = st.id and ss.sede_id in (select public.desk_sede_ids()))
  order by st.full_name;
$$;

create or replace function public.staff_unlock(p_staff_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin   public.staff_pins%rowtype;
  v_token text;
  v_max   integer := public.setting_int('staff.pin_max_attempts', 5);
begin
  if not public.is_desk() then
    raise exception 'NO_DESK' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.staff st
    join public.staff_sedes ss on ss.staff_id = st.id
    where st.id = p_staff_id and st.active and ss.sede_id in (select public.desk_sede_ids())
  ) then
    raise exception 'STAFF_NOT_HERE' using errcode = '42501';
  end if;

  select * into v_pin from public.staff_pins where staff_id = p_staff_id for update;
  if v_pin.staff_id is null then
    raise exception 'NO_PIN' using errcode = '42501';
  end if;
  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    raise exception 'PIN_LOCKED' using errcode = '42501';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$'
     or extensions.crypt(p_pin, v_pin.pin_hash) <> v_pin.pin_hash then
    update public.staff_pins
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= v_max
          then now() + make_interval(mins => public.setting_int('staff.pin_lock_minutes', 15))
          else null end
    where staff_id = p_staff_id;
    return null;  -- wrong PIN: the caller shows the error (no exception, so the counter sticks)
  end if;

  update public.staff_pins set failed_attempts = 0, locked_until = null where staff_id = p_staff_id;

  -- One person at a time per desk.
  update public.staff_sessions set ended_at = now()
  where desk_id = (select auth.uid()) and ended_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_staff_id, (select auth.uid()),
          now() + make_interval(mins => public.setting_int('staff.idle_minutes', 10)));
  return v_token;
end;
$$;

-- Slides the idle window forward. Called by the server on each staff request.
create or replace function public.staff_session_touch()
returns boolean
language sql
security definer
set search_path = public
as $$
  with s as (
    update public.staff_sessions
    set last_seen_at = now(),
        expires_at = now() + make_interval(mins => public.setting_int('staff.idle_minutes', 10))
    where token_hash = public.staff_token_hash()
      and desk_id = (select auth.uid())
      and ended_at is null
      and expires_at > now()
    returning 1
  )
  select exists (select 1 from s);
$$;

create or replace function public.staff_lock()
returns void
language sql
security definer
set search_path = public
as $$
  update public.staff_sessions set ended_at = now()
  where token_hash = public.staff_token_hash()
    and desk_id = (select auth.uid())
    and ended_at is null;
$$;

-- Everything the app needs about the acting employee in one round-trip.
create or replace function public.current_staff()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id', st.id,
    'full_name', st.full_name,
    'role_id', st.role_id,
    'role_label', r.label,
    'can_manage_payroll', st.can_manage_payroll,
    'permissions', coalesce((
      select json_agg(rp.permission_id order by rp.permission_id)
      from public.staff_role_permissions rp where rp.role_id = st.role_id), '[]'::json),
    'sede_ids', coalesce((select json_agg(x order by x) from public.staff_sede_ids() x), '[]'::json)
  )
  from public.staff st
  join public.staff_roles r on r.id = st.role_id
  where st.id = public.current_staff_id();
$$;

-- Sets or resets a PIN: employees.manage for anyone in scope, or yourself.
create or replace function public.staff_set_pin(p_staff_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN_FORMAT' using errcode = '22023';
  end if;
  -- coalesce: with no PIN session current_staff_id() is NULL, and IF NOT NULL
  -- would fall through and let any signed-in account set anyone's PIN.
  if not coalesce(
    public.current_staff_id() = p_staff_id
    or public.staff_manageable(p_staff_id),
    false
  ) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.staff_pins (staff_id, pin_hash)
  values (p_staff_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (staff_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();
end;
$$;

-- First run only: a desk with no staff anywhere creates the first administrator.
create or replace function public.staff_bootstrap(p_full_name text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_desk() then
    raise exception 'NO_DESK' using errcode = '42501';
  end if;
  if exists (select 1 from public.staff) then
    raise exception 'ALREADY_BOOTSTRAPPED' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN_FORMAT' using errcode = '22023';
  end if;
  insert into public.staff (full_name, role_id, can_manage_payroll)
  values (btrim(p_full_name), 'admin', true)
  returning id into v_id;
  insert into public.staff_sedes (staff_id, sede_id) select v_id, sede_id from public.desk_sede_ids() sede_id;
  insert into public.staff_pins (staff_id, pin_hash)
  values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));
  return v_id;
end;
$$;

-- New employee + sedes + PIN in one step (a plain insert couldn't read its own
-- row back: it has no sede yet when the insert returns).
create or replace function public.staff_create(
  p_full_name text, p_role_id text, p_sede_ids text[], p_pin text,
  p_phone text default null, p_email text default null, p_can_manage_payroll boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.staff_can('employees.manage') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_can_manage_payroll and not public.staff_can('payroll.manage') then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if coalesce(array_length(p_sede_ids, 1), 0) = 0
     or exists (select 1 from unnest(p_sede_ids) s where s not in (select public.staff_sede_ids())) then
    raise exception 'SEDE_NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN_FORMAT' using errcode = '22023';
  end if;
  insert into public.staff (full_name, role_id, phone, email, can_manage_payroll)
  values (btrim(p_full_name), p_role_id, nullif(btrim(p_phone), ''), nullif(lower(btrim(p_email)), ''), p_can_manage_payroll)
  returning id into v_id;
  insert into public.staff_sedes (staff_id, sede_id) select v_id, unnest(p_sede_ids);
  insert into public.staff_pins (staff_id, pin_hash)
  values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));
  return v_id;
end;
$$;

-- 10. RLS ------------------------------------------------------------------------
alter table public.sedes                  enable row level security;
alter table public.app_settings           enable row level security;
alter table public.staff_roles            enable row level security;
alter table public.staff_permissions      enable row level security;
alter table public.staff_role_permissions enable row level security;
alter table public.staff                  enable row level security;
alter table public.staff_sedes            enable row level security;
alter table public.staff_pins             enable row level security;  -- no policies: definer functions only
alter table public.desk_sedes             enable row level security;
alter table public.staff_sessions         enable row level security;  -- no policies: definer functions only

drop policy if exists "anyone reads sedes" on public.sedes;
create policy "anyone reads sedes" on public.sedes for select to anon, authenticated using (true);
drop policy if exists "settings staff edits sedes" on public.sedes;
create policy "settings staff edits sedes" on public.sedes for update to authenticated
  using ((select public.staff_can('settings.manage')) and id in (select public.staff_sede_ids()))
  with check ((select public.staff_can('settings.manage')) and id in (select public.staff_sede_ids()));

drop policy if exists "signed in reads settings" on public.app_settings;
create policy "signed in reads settings" on public.app_settings for select to authenticated using (true);
drop policy if exists "settings staff edits settings" on public.app_settings;
create policy "settings staff edits settings" on public.app_settings for update to authenticated
  using ((select public.staff_can('settings.manage')))
  with check ((select public.staff_can('settings.manage')));

drop policy if exists "desks read roles" on public.staff_roles;
create policy "desks read roles" on public.staff_roles for select to authenticated using ((select public.is_desk()));
drop policy if exists "desks read permissions" on public.staff_permissions;
create policy "desks read permissions" on public.staff_permissions for select to authenticated using ((select public.is_desk()));
drop policy if exists "desks read role permissions" on public.staff_role_permissions;
create policy "desks read role permissions" on public.staff_role_permissions for select to authenticated using ((select public.is_desk()));

drop policy if exists "staff reads colleagues" on public.staff;
create policy "staff reads colleagues" on public.staff for select to authenticated
  using ((select public.current_staff_id()) is not null
         and exists (select 1 from public.staff_sedes ss
                     where ss.staff_id = staff.id and ss.sede_id in (select public.staff_sede_ids())));
-- No insert policy: new employees go through staff_create().
drop policy if exists "managers edit staff" on public.staff;
create policy "managers edit staff" on public.staff for update to authenticated
  using (public.staff_manageable(id))
  with check ((select public.staff_can('employees.manage'))
              and (not can_manage_payroll or (select public.staff_can('payroll.manage'))));

-- New employees get their sedes in staff_create(); these only edit existing staff.
drop policy if exists "staff reads staff sedes" on public.staff_sedes;
create policy "staff reads staff sedes" on public.staff_sedes for select to authenticated
  using ((select public.current_staff_id()) is not null and sede_id in (select public.staff_sede_ids()));
drop policy if exists "managers assign sedes" on public.staff_sedes;
create policy "managers assign sedes" on public.staff_sedes for insert to authenticated
  with check (public.staff_manageable(staff_id) and sede_id in (select public.staff_sede_ids()));
drop policy if exists "managers unassign sedes" on public.staff_sedes;
create policy "managers unassign sedes" on public.staff_sedes for delete to authenticated
  using (public.staff_manageable(staff_id) and sede_id in (select public.staff_sede_ids()));

drop policy if exists "desk reads own sedes" on public.desk_sedes;
create policy "desk reads own sedes" on public.desk_sedes for select to authenticated
  using (desk_id = (select auth.uid()) or (select public.staff_can('settings.manage')));

-- 11. Grants ------------------------------------------------------------------------
-- This project's default privileges give anon and authenticated ALL on every new
-- table (TRUNCATE included, which RLS does not stop), so start from zero. UPDATE
-- is granted per column: ids and audit columns can't be written from a session.
revoke all on public.sedes, public.app_settings, public.staff_roles, public.staff_permissions,
  public.staff_role_permissions, public.staff, public.staff_sedes, public.staff_pins,
  public.desk_sedes, public.staff_sessions from public, anon, authenticated;
grant select on public.sedes to anon;
grant select on public.sedes, public.app_settings to authenticated;
grant update (name, address, building_capacity, status, opening_hours) on public.sedes to authenticated;
grant update (value) on public.app_settings to authenticated;
grant select on public.staff_roles, public.staff_permissions, public.staff_role_permissions to authenticated;
grant select on public.staff to authenticated;
grant update (full_name, role_id, phone, email, active, can_manage_payroll) on public.staff to authenticated;
grant select, insert, delete on public.staff_sedes to authenticated;
grant select on public.desk_sedes to authenticated;
grant all on public.sedes, public.app_settings, public.staff_roles, public.staff_permissions,
  public.staff_role_permissions, public.staff, public.staff_sedes, public.staff_pins,
  public.desk_sedes, public.staff_sessions to service_role;

revoke execute on function public.staff_unlock(uuid, text), public.staff_session_touch(),
  public.staff_lock(), public.current_staff(), public.staff_set_pin(uuid, text),
  public.staff_bootstrap(text, text), public.desk_staff_list(),
  public.staff_create(text, text, text[], text, text, text, boolean) from public, anon;
grant execute on function public.staff_unlock(uuid, text), public.staff_session_touch(),
  public.staff_lock(), public.current_staff(), public.staff_set_pin(uuid, text),
  public.staff_bootstrap(text, text), public.desk_staff_list(),
  public.staff_create(text, text, text[], text, text, text, boolean) to authenticated;

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
  desk_id uuid; desk text; stranger text := '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';
  o uuid; a uuid; c uuid; x uuid; m uuid; who uuid;
  t_o text; t_a text; t_c text; t_m text; f text[] := '{}';
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;

  f := f || public.dryrun_check('invite: client without coach', $q$insert into public.preauthorized_emails (email, intended_role) values ('dryrun@example.com', 'client')$q$, 'ok:1');
  f := f || public.dryrun_check('invite: coach with coach_id', format($q$insert into public.preauthorized_emails (email, intended_role, coach_id) values ('dryrun@example.com', 'coach', %L)$q$, desk_id), '%shape_check%');

  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', '{}', true);
  execute 'set local role authenticated';
  o := public.staff_bootstrap('DEMO Owner', '1111');
  f := f || public.dryrun_check('bootstrap only once', $q$select public.staff_bootstrap('DEMO Two', '1111')$q$, 'ALREADY_BOOTSTRAPPED');
  f := f || public.dryrun_check('wrong PIN gives no token', format($q$select 1 where public.staff_unlock(%L, '0000') is null$q$, o), 'ok:1');
  t_o := public.staff_unlock(o, '1111');
  perform set_config('request.headers', json_build_object('x-staff-token', t_o)::text, true);
  a := public.staff_create('DEMO Admin', 'admin', array['bellavista'], '2222');
  c := public.staff_create('DEMO Coach', 'coach', array['bellavista'], '3333');
  x := public.staff_create('DEMO Cafe', 'coach', array['cafe'], '4444');
  m := public.staff_create('DEMO Both', 'admin', array['bellavista','cafe'], '5555');

  -- payroll holder
  f := f || public.dryrun_check('owner touch', $q$select 1 where public.staff_session_touch()$q$, 'ok:1');
  f := f || public.dryrun_check('owner resets coach', format($q$select public.staff_set_pin(%L, '9999')$q$, c), 'ok:1');
  f := f || public.dryrun_check('owner resets self', format($q$select public.staff_set_pin(%L, '9999')$q$, o), 'ok:1');
  f := f || public.dryrun_check('owner grants payroll', format($q$update public.staff set can_manage_payroll = true where id = %L returning id$q$, a), 'ok:1');

  -- admin of one sede, no payroll
  perform set_config('request.headers', '{}', true);
  t_a := public.staff_unlock(a, '2222');
  perform set_config('request.headers', json_build_object('x-staff-token', t_a)::text, true);
  f := f || public.dryrun_check('admin resets holder PIN', format($q$select public.staff_set_pin(%L, '9999')$q$, o), 'NOT_ALLOWED');
  f := f || public.dryrun_check('admin revokes holder flag', format($q$update public.staff set can_manage_payroll = false where id = %L$q$, o), 'ok:0');
  f := f || public.dryrun_check('admin deactivates holder', format($q$update public.staff set active = false where id = %L$q$, o), 'ok:0');
  f := f || public.dryrun_check('admin removes holder sede', format($q$delete from public.staff_sedes where staff_id = %L and sede_id = 'bellavista'$q$, o), 'ok:0');
  f := f || public.dryrun_check('admin grants self payroll', format($q$update public.staff set can_manage_payroll = true where id = %L$q$, a), '%row-level security%');
  f := f || public.dryrun_check('admin creates holder', $q$select public.staff_create('DEMO H', 'admin', array['bellavista'], '7777', null, null, true)$q$, 'NOT_ALLOWED');
  f := f || public.dryrun_check('admin creates in other sede', $q$select public.staff_create('DEMO H', 'coach', array['cafe'], '7777')$q$, 'SEDE_NOT_ALLOWED');
  f := f || public.dryrun_check('admin resets other sede', format($q$select public.staff_set_pin(%L, '9999')$q$, x), 'NOT_ALLOWED');
  f := f || public.dryrun_check('admin pulls from other sede', format($q$insert into public.staff_sedes values (%L, 'bellavista')$q$, x), '%row-level security%');
  f := f || public.dryrun_check('admin forges created_by', format($q$update public.staff set created_by_staff = %L where id = %L$q$, a, c), '%permission denied%');
  f := f || public.dryrun_check('admin forges setting audit', format($q$update public.app_settings set updated_by_staff = %L$q$, o), '%permission denied%');
  f := f || public.dryrun_check('admin changes sede id', $q$update public.sedes set id = 'otra' where id = 'bellavista'$q$, '%permission denied%');
  f := f || public.dryrun_check('admin edits other sede', $q$update public.sedes set name = 'Otra' where id = 'cafe'$q$, 'ok:0');
  f := f || public.dryrun_check('admin edits own sede', $q$update public.sedes set name = 'Prueba' where id = 'bellavista' returning id$q$, 'ok:1');
  f := f || public.dryrun_check('attempt limit too high', $q$update public.app_settings set value = '9999' where key = 'staff.pin_max_attempts'$q$, '%pin_rules_check%');
  f := f || public.dryrun_check('setting not a number', $q$update public.app_settings set value = '"x"' where key = 'staff.idle_minutes'$q$, '%pin_rules_check%');
  f := f || public.dryrun_check('setting in range', $q$update public.app_settings set value = '12' where key = 'staff.idle_minutes' returning key$q$, 'ok:1');
  f := f || public.dryrun_check('admin resets coach', format($q$select public.staff_set_pin(%L, '9999')$q$, c), 'ok:1');
  f := f || public.dryrun_check('admin deactivates coach', format($q$update public.staff set active = false where id = %L returning id$q$, c), 'ok:1');

  update public.staff set phone = '88880000' where id = c;
  select updated_by_staff into who from public.staff where id = c;
  if who is distinct from a then f := f || 'staff audit not stamped'::text; end if;
  update public.app_settings set value = '11' where key = 'staff.idle_minutes';
  select updated_by_staff into who from public.app_settings where key = 'staff.idle_minutes';
  if who is distinct from a then f := f || 'setting audit not stamped'::text; end if;

  -- admin of both sedes, no payroll
  perform set_config('request.headers', '{}', true);
  t_m := public.staff_unlock(m, '5555');
  perform set_config('request.headers', json_build_object('x-staff-token', t_m)::text, true);
  f := f || public.dryrun_check('two-sede admin adds sede', format($q$insert into public.staff_sedes values (%L, 'cafe')$q$, c), 'ok:1');
  f := f || public.dryrun_check('two-sede admin removes sede', format($q$delete from public.staff_sedes where staff_id = %L and sede_id = 'cafe'$q$, x), 'ok:1');

  -- coach
  perform set_config('request.headers', '{}', true);
  t_c := public.staff_unlock(c, '3333');
  perform set_config('request.headers', json_build_object('x-staff-token', t_c)::text, true);
  f := f || public.dryrun_check('coach resets holder', format($q$select public.staff_set_pin(%L, '9999')$q$, o), 'NOT_ALLOWED');
  f := f || public.dryrun_check('coach resets self', format($q$select public.staff_set_pin(%L, '9999')$q$, c), 'ok:1');
  f := f || public.dryrun_check('coach promotes self', format($q$update public.staff set role_id = 'admin' where id = %L$q$, c), 'ok:0');
  f := f || public.dryrun_check('coach edits settings', $q$update public.app_settings set value = '30' where key = 'staff.idle_minutes'$q$, 'ok:0');
  f := f || public.dryrun_check('coach adds staff', $q$select public.staff_create('DEMO H', 'coach', array['bellavista'], '7777')$q$, 'NOT_ALLOWED');
  f := f || public.dryrun_check('coach session is live', $q$select 1 where public.current_staff() is not null$q$, 'ok:1');
  perform public.staff_lock();
  f := f || public.dryrun_check('locked: no staff', $q$select 1 where public.current_staff() is not null$q$, 'ok:0');
  f := f || public.dryrun_check('locked: resets PIN', format($q$select public.staff_set_pin(%L, '9999')$q$, o), 'NOT_ALLOWED');

  -- a live token used from another login
  t_a := public.staff_unlock(a, '2222');
  perform set_config('request.headers', json_build_object('x-staff-token', t_a)::text, true);
  perform set_config('request.jwt.claims', stranger, true);
  f := f || public.dryrun_check('stolen token', $q$select 1 where public.staff_can('settings.manage')$q$, 'ok:0');
  f := f || public.dryrun_check('client resets PIN', format($q$select public.staff_set_pin(%L, '9999')$q$, o), 'NOT_ALLOWED');
  f := f || public.dryrun_check('client unlocks', format($q$select public.staff_unlock(%L, '1111')$q$, o), 'NO_DESK');
  f := f || public.dryrun_check('client bootstraps', $q$select public.staff_bootstrap('DEMO', '1111')$q$, 'NO_DESK');
  f := f || public.dryrun_check('client reads staff', $q$select 1 from public.staff$q$, 'ok:0');
  f := f || public.dryrun_check('client reads PINs', $q$select 1 from public.staff_pins$q$, '%permission denied%');
  f := f || public.dryrun_check('client reads sessions', $q$select 1 from public.staff_sessions$q$, '%permission denied%');
  f := f || public.dryrun_check('client truncates', $q$truncate public.staff_sedes$q$, '%permission denied%');

  -- disabled desk, with its PIN session still open
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
  update public.profiles set authorized = false where id = desk_id;
  perform set_config('request.jwt.claims', desk, true);
  execute 'set local role authenticated';
  f := f || public.dryrun_check('disabled desk keeps permissions', $q$select 1 where public.staff_can('settings.manage')$q$, 'ok:0');
  f := f || public.dryrun_check('disabled desk resets self', format($q$select public.staff_set_pin(%L, '9999')$q$, a), 'NOT_ALLOWED');
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
  update public.profiles set authorized = true where id = desk_id;

  -- expired session
  update public.staff_sessions set expires_at = now() - interval '1 minute';
  perform set_config('request.jwt.claims', desk, true);
  execute 'set local role authenticated';
  f := f || public.dryrun_check('expired session', $q$select 1 where public.staff_can('settings.manage')$q$, 'ok:0');

  -- brute force
  perform set_config('request.headers', '{}', true);
  for i in 1..5 loop perform public.staff_unlock(x, '0000'); end loop;
  perform public.staff_unlock(c, '0000');
  f := f || public.dryrun_check('other person not locked', format($q$select 1 where public.staff_unlock(%L, '2222') is not null$q$, a), 'ok:1');
  f := f || public.dryrun_check('five wrong PINs lock', format($q$select public.staff_unlock(%L, '4444')$q$, x), 'PIN_LOCKED');

  -- anon
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  f := f || public.dryrun_check('anon reads sedes', $q$select 1 from public.sedes$q$, 'ok:2');
  f := f || public.dryrun_check('anon reads settings', $q$select 1 from public.app_settings$q$, '%permission denied%');
  f := f || public.dryrun_check('anon reads staff', $q$select 1 from public.staff$q$, '%permission denied%');
  f := f || public.dryrun_check('anon truncates', $q$truncate public.staff_sessions$q$, '%permission denied%');
  f := f || public.dryrun_check('anon resets PIN', format($q$select public.staff_set_pin(%L, '9999')$q$, o), '%permission denied%');
  execute 'reset role';

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'DRYRUN_OK: todas las pruebas pasaron'; end if;
  raise exception 'DRYRUN_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;

$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'DRYRUN_ABORT: sin resultado');
end
$dry$;
