-- 0028: salones, disciplines, class schedule and reservations (phases 5 and 6).
-- Run in the Supabase SQL editor after supabase/dry-runs/0028_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023–0027.
--
-- MODEL
--   * salones: rooms of a sede, each with its own capacity.
--   * disciplines: the label a class carries (Pilates Reformer, Yoga…), shared by
--     both sedes. discipline_salons says which salón a discipline uses in each sede,
--     so a new class picks its salón from its discipline.
--   * class_templates: the weekly schedule. One template = one discipline at one
--     time on some weekdays, optionally repeated every hour (open gym, recovery).
--   * classes: dated occurrences. They are generated from the templates on demand
--     (classes_ensure, idempotent) for the days someone looks at, so there is no
--     job to schedule. One-off classes are rows with no template. Cancelling an
--     occurrence keeps the row (status 'cancelled'), so it is never regenerated.
--   * class_reservations: who booked what. Only the RPCs below write them, and they
--     enforce capacity under a lock on the sede row: two people can't take the
--     last spot at the same time, per class or per building.
--
-- WHO SEES WHAT
--   staff   → schedule, rosters and occupancy of their sedes; writes per permission
--             (schedule.write, reservations.write, settings.manage).
--   client  → salones, disciplines and the calendar (with spots left) through
--             class_slots(); their own reservations.
--   anon    → public_schedule(): open sedes only, spots left, never the aforo.

-- 1. Settings ---------------------------------------------------------------------------
insert into public.app_settings (key, value, label) values
  ('reservations.cancel_cutoff_hours', '2', 'Horas antes de la clase hasta las que el cliente puede cancelar'),
  ('reservations.book_ahead_days',     '7', 'Días hacia adelante que el cliente puede reservar')
on conflict (key) do nothing;

alter table public.app_settings drop constraint if exists app_settings_reservation_rules_check;
alter table public.app_settings add constraint app_settings_reservation_rules_check check (
  case
    when key not in ('reservations.cancel_cutoff_hours', 'reservations.book_ahead_days') then true
    when jsonb_typeof(value) <> 'number' then false
    when (value #>> '{}') !~ '^[0-9]{1,2}$' then false
    when key = 'reservations.cancel_cutoff_hours' then (value #>> '{}')::integer between 0 and 48
    else (value #>> '{}')::integer between 1 and 30
  end
);

-- 2. Salones -----------------------------------------------------------------------------
create table if not exists public.salones (
  id               uuid primary key default gen_random_uuid(),
  sede_id          text not null references public.sedes (id),
  name             text not null check (char_length(btrim(name)) between 2 and 60),
  capacity         integer not null check (capacity between 1 and 200),
  sort_order       integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null,
  unique (sede_id, name)
);
comment on table public.salones is 'Rooms of a sede. Names and capacities are pending from Jeremy: seeded generic, editable.';

-- Generic, editable placeholders (spec §5: names and capacities pending). Capacity
-- starts at the building capacity so it adds no limit until someone sets it.
insert into public.salones (sede_id, name, capacity, sort_order)
select s.id, 'Salón ' || g, s.building_capacity, g
from public.sedes s cross join generate_series(1, 5) g
where not exists (select 1 from public.salones x where x.sede_id = s.id)
on conflict do nothing;

-- 3. Disciplines -------------------------------------------------------------------------
create table if not exists public.disciplines (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name             text not null check (char_length(btrim(name)) between 2 and 60),
  default_capacity integer check (default_capacity between 1 and 200),
  default_minutes  integer not null default 60 check (default_minutes between 15 and 240),
  sort_order       integer not null default 0,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null
);
comment on table public.disciplines is 'Class labels. slug matches the landing ?servicio= ids.';

-- Spec §2: 6–8 per class by default, Reformer 5 (5 machines), Café open gym 40 per hour.
insert into public.disciplines (slug, name, default_capacity, sort_order) values
  ('reformer',   'Pilates Reformer',       5,  1),
  ('yoga',       'Yoga',                   8,  2),
  ('barre',      'Barre',                  8,  3),
  ('functional', 'Functional System',      8,  4),
  ('open-gym',   'Open gym',               40, 5),
  ('recovery',   'Recovery',               null, 6),
  ('baile',      'Baile',                  8,  7),
  ('personal',   'Entrenamiento personal', 1,  8)
on conflict (slug) do nothing;

create table if not exists public.discipline_salons (
  discipline_id uuid not null references public.disciplines (id) on delete cascade,
  sede_id       text not null references public.sedes (id),
  salon_id      uuid not null references public.salones (id) on delete cascade,
  primary key (discipline_id, sede_id)
);
create index if not exists discipline_salons_salon_idx on public.discipline_salons (salon_id);

-- The salón must belong to the sede of the row.
create or replace function public.guard_discipline_salon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.salones where id = new.salon_id and sede_id = new.sede_id) then
    raise exception 'SALON_NOT_IN_SEDE';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_discipline_salon on public.discipline_salons;
create trigger guard_discipline_salon before insert or update on public.discipline_salons
  for each row execute function public.guard_discipline_salon();

-- 4. Weekly schedule ---------------------------------------------------------------------
create table if not exists public.class_templates (
  id               uuid primary key default gen_random_uuid(),
  sede_id          text not null references public.sedes (id),
  discipline_id    uuid not null references public.disciplines (id),
  salon_id         uuid not null references public.salones (id),
  coach_staff_id   uuid references public.staff (id) on delete set null,
  weekdays         smallint[] not null,               -- ISO: 1 = lunes … 7 = domingo
  start_time       time not null,
  duration_min     integer not null check (duration_min between 15 and 240),
  repeat_until     time,                              -- set: one class every hour until this time
  capacity         integer check (capacity between 1 and 200),  -- null: discipline → salón
  valid_from       date not null,
  valid_until      date,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null,
  constraint class_templates_shape_check check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[]
    and extract(second from start_time) = 0
    and (repeat_until is null or repeat_until > start_time)
    and start_time + make_interval(mins => duration_min) > start_time  -- doesn't cross midnight
    and (valid_until is null or valid_until >= valid_from)
  )
);
create index if not exists class_templates_sede_idx on public.class_templates (sede_id) where active;

-- 5. Dated classes -----------------------------------------------------------------------
create table if not exists public.classes (
  id               uuid primary key default gen_random_uuid(),
  sede_id          text not null references public.sedes (id),
  discipline_id    uuid not null references public.disciplines (id),
  salon_id         uuid not null references public.salones (id),
  coach_staff_id   uuid references public.staff (id) on delete set null,
  template_id      uuid references public.class_templates (id) on delete set null,
  template_slot    timestamptz,  -- the weekly slot it fills; stays put if the class is moved
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  capacity         integer not null check (capacity between 1 and 200),
  status           text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  cancel_reason    text check (char_length(cancel_reason) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null,
  constraint classes_time_check check (ends_at > starts_at and ends_at <= starts_at + interval '4 hours'),
  unique (template_id, template_slot)
);
create index if not exists classes_sede_time_idx on public.classes (sede_id, starts_at);
create index if not exists classes_salon_time_idx on public.classes (salon_id, starts_at);

-- 6. Reservations ------------------------------------------------------------------------
create table if not exists public.class_reservations (
  id                 uuid primary key default gen_random_uuid(),
  class_id           uuid not null references public.classes (id) on delete cascade,
  client_id          uuid not null references public.clients (id) on delete cascade,
  status             text not null default 'booked' check (status in ('booked', 'cancelled')),
  attended_at        timestamptz,
  booked_by_staff    uuid references public.staff (id) on delete set null,  -- null: the client
  cancelled_at       timestamptz,
  cancelled_by_staff uuid references public.staff (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by_staff   uuid references public.staff (id) on delete set null,
  constraint class_reservations_cancel_check check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint class_reservations_attended_check check (attended_at is null or status = 'booked')
);
-- One live reservation per client per class; cancelled ones stay as history.
create unique index if not exists class_reservations_live_idx
  on public.class_reservations (class_id, client_id) where status = 'booked';
create index if not exists class_reservations_client_idx on public.class_reservations (client_id, created_at desc);

-- 7. Helpers -----------------------------------------------------------------------------
-- The acting employee holds p_permission and works in this sede.
create or replace function public.staff_can_sede(p_permission text, p_sede_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.staff_can(p_permission), false)
     and p_sede_id in (select public.staff_sede_ids());
$$;

-- Sede of the signed-in client.
create or replace function public.own_client_sede()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select sede_id from public.clients where id = public.own_client_id();
$$;

-- Generate the template classes of a sede for some days (idempotent). Only today
-- onwards and at most 60 days ahead, so nobody can flood the table.
create or replace function public.classes_ensure(p_sede_id text, p_from date, p_to date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := greatest(p_from, public.today_cr());
  v_to   date := least(p_to, public.today_cr() + 60);
begin
  if p_sede_id is null or v_from > v_to then
    return;
  end if;
  insert into public.classes (sede_id, discipline_id, salon_id, coach_staff_id, template_id,
                              template_slot, starts_at, ends_at, capacity)
  select t.sede_id, t.discipline_id, t.salon_id, t.coach_staff_id, t.id,
         s.starts_at, s.starts_at, s.starts_at + make_interval(mins => t.duration_min),
         least(coalesce(t.capacity, d.default_capacity, sa.capacity), sa.capacity)
  from public.class_templates t
  join public.disciplines d on d.id = t.discipline_id
  join public.salones sa on sa.id = t.salon_id
  cross join generate_series(v_from, v_to, interval '1 day') dd
  -- Hourly templates: one class every hour while it still ends by repeat_until.
  cross join lateral (
    select (dd::date + t.start_time + make_interval(hours => k)) at time zone 'America/Costa_Rica' as starts_at
    from generate_series(0, case when t.repeat_until is null then 0 else floor(
      extract(epoch from (t.repeat_until - t.start_time - make_interval(mins => t.duration_min))) / 3600)::integer end) k
  ) s
  where t.sede_id = p_sede_id
    and t.active
    and extract(isodow from dd)::smallint = any (t.weekdays)
    and dd::date between t.valid_from and coalesce(t.valid_until, 'infinity'::date)
    and s.starts_at > now()
  on conflict (template_id, template_slot) do nothing;
end;
$$;

-- Future, unbooked, not cancelled occurrences of a template: removed when the
-- template changes so they regenerate from the new version. Booked ones stay.
create or replace function public.class_template_purge(p_template_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.classes c
  where c.template_id = p_template_id
    and c.status = 'scheduled'
    and c.starts_at > now()
    and not exists (select 1 from public.class_reservations r where r.class_id = c.id);
$$;

-- People in the building during a time range (live reservations of overlapping classes).
create or replace function public.sede_booked_between(p_sede_id text, p_from timestamptz, p_to timestamptz)
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.class_reservations r
  join public.classes c on c.id = r.class_id
  where c.sede_id = p_sede_id and c.status = 'scheduled' and r.status = 'booked'
    and c.starts_at < p_to and c.ends_at > p_from;
$$;

-- 8. Calendar reads ------------------------------------------------------------------------
-- One day of a sede (optionally one salón). Staff of the sede and its clients.
-- my_reservation_id is the caller's own live reservation (clients).
create or replace function public.class_slots(p_sede_id text, p_day date, p_salon_id uuid default null)
returns table (
  class_id          uuid,
  starts_at         timestamptz,
  ends_at           timestamptz,
  status            text,
  discipline_id     uuid,
  discipline_name   text,
  discipline_slug   text,
  salon_id          uuid,
  salon_name        text,
  coach_name        text,
  capacity          integer,
  booked            integer,
  my_reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_client uuid := public.own_client_id();
begin
  if not (p_sede_id in (select public.staff_sede_ids())
          or (v_client is not null and p_sede_id = public.own_client_sede())) then
    raise exception 'NOT_ALLOWED';
  end if;
  if p_day is null or p_day < public.today_cr() - 60 or p_day > public.today_cr() + 60 then
    raise exception 'DAY_OUT_OF_RANGE';
  end if;
  perform public.classes_ensure(p_sede_id, p_day, p_day);
  return query
  select c.id, c.starts_at, c.ends_at, c.status, d.id, d.name, d.slug, sa.id, sa.name, st.full_name,
         c.capacity,
         (select count(*)::integer from public.class_reservations r where r.class_id = c.id and r.status = 'booked'),
         (select r.id from public.class_reservations r
           where r.class_id = c.id and r.status = 'booked' and r.client_id = v_client)
  from public.classes c
  join public.disciplines d on d.id = c.discipline_id
  join public.salones sa on sa.id = c.salon_id
  left join public.staff st on st.id = c.coach_staff_id
  where c.sede_id = p_sede_id
    and (p_salon_id is null or c.salon_id = p_salon_id)
    and (c.starts_at at time zone 'America/Costa_Rica')::date = p_day
  order by c.starts_at, sa.sort_order, d.sort_order;
end;
$$;

-- The landing's #horario: open sedes only, spots left instead of the aforo, the
-- coach's first name only, cancelled classes hidden.
create or replace function public.public_schedule(p_sede_id text, p_from date, p_days integer)
returns table (
  starts_at       timestamptz,
  discipline_slug text,
  discipline_name text,
  coach_name      text,
  spots_left      integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_from date := greatest(coalesce(p_from, public.today_cr()), public.today_cr());
  v_to   date := v_from + least(greatest(coalesce(p_days, 7), 1), 14) - 1;
begin
  if not exists (select 1 from public.sedes where id = p_sede_id and status = 'open') then
    return;
  end if;
  perform public.classes_ensure(p_sede_id, v_from, v_to);
  return query
  select c.starts_at, d.slug, d.name, split_part(st.full_name, ' ', 1),
         greatest(0, c.capacity - (select count(*)::integer from public.class_reservations r
                                    where r.class_id = c.id and r.status = 'booked'))
  from public.classes c
  join public.disciplines d on d.id = c.discipline_id
  left join public.staff st on st.id = c.coach_staff_id
  where c.sede_id = p_sede_id
    and c.status = 'scheduled'
    and c.starts_at > now()
    and (c.starts_at at time zone 'America/Costa_Rica')::date between v_from and v_to
  order by c.starts_at, d.sort_order;
end;
$$;

-- Live occupancy for the desk: classes in progress now, per salón and building.
create or replace function public.occupancy_now(p_sede_id text)
returns table (salon_id uuid, salon_name text, salon_capacity integer, booked integer, attended integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if p_sede_id not in (select public.staff_sede_ids()) then
    raise exception 'NOT_ALLOWED';
  end if;
  return query
  select sa.id, sa.name, sa.capacity,
         count(r.id) filter (where r.status = 'booked')::integer,
         count(r.id) filter (where r.status = 'booked' and r.attended_at is not null)::integer
  from public.salones sa
  left join public.classes c on c.salon_id = sa.id and c.status = 'scheduled'
    and c.starts_at <= now() and c.ends_at > now()
  left join public.class_reservations r on r.class_id = c.id
  where sa.sede_id = p_sede_id and sa.active
  group by sa.id, sa.name, sa.capacity, sa.sort_order
  order by sa.sort_order, sa.name;
end;
$$;

-- 9. Schedule writes (staff with schedule.write) ---------------------------------------
create or replace function public.class_template_save(p_id uuid, p_tpl jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old   public.class_templates;
  v_sede  text;
  v_disc  uuid := (p_tpl ->> 'discipline_id')::uuid;
  v_salon uuid := (p_tpl ->> 'salon_id')::uuid;
  v_coach uuid := nullif(p_tpl ->> 'coach_staff_id', '')::uuid;
  v_id    uuid;
begin
  if p_id is not null then
    select * into v_old from public.class_templates where id = p_id;
    if v_old.id is null then raise exception 'NOT_ALLOWED'; end if;
    v_sede := v_old.sede_id;
  else
    v_sede := p_tpl ->> 'sede_id';
  end if;
  if not public.staff_can_sede('schedule.write', v_sede) then
    raise exception 'NOT_ALLOWED';
  end if;
  if not exists (select 1 from public.salones where id = v_salon and sede_id = v_sede and active) then
    raise exception 'SALON_NOT_IN_SEDE';
  end if;
  if not exists (select 1 from public.disciplines where id = v_disc and active) then
    raise exception 'DISCIPLINE_NOT_AVAILABLE';
  end if;
  if v_coach is not null and not exists (
    select 1 from public.staff s join public.staff_sedes ss on ss.staff_id = s.id
    where s.id = v_coach and s.active and ss.sede_id = v_sede) then
    raise exception 'COACH_NOT_IN_SEDE';
  end if;

  if p_id is null then
    insert into public.class_templates (sede_id, discipline_id, salon_id, coach_staff_id, weekdays,
      start_time, duration_min, repeat_until, capacity, valid_from, valid_until)
    values (v_sede, v_disc, v_salon, v_coach,
      array(select jsonb_array_elements_text(p_tpl -> 'weekdays')::smallint),
      (p_tpl ->> 'start_time')::time, (p_tpl ->> 'duration_min')::integer,
      nullif(p_tpl ->> 'repeat_until', '')::time, nullif(p_tpl ->> 'capacity', '')::integer,
      coalesce(nullif(p_tpl ->> 'valid_from', '')::date, public.today_cr()),
      nullif(p_tpl ->> 'valid_until', '')::date)
    returning id into v_id;
  else
    update public.class_templates set
      discipline_id  = v_disc,
      salon_id       = v_salon,
      coach_staff_id = v_coach,
      weekdays       = array(select jsonb_array_elements_text(p_tpl -> 'weekdays')::smallint),
      start_time     = (p_tpl ->> 'start_time')::time,
      duration_min   = (p_tpl ->> 'duration_min')::integer,
      repeat_until   = nullif(p_tpl ->> 'repeat_until', '')::time,
      capacity       = nullif(p_tpl ->> 'capacity', '')::integer,
      valid_from     = coalesce(nullif(p_tpl ->> 'valid_from', '')::date, valid_from),
      valid_until    = nullif(p_tpl ->> 'valid_until', '')::date,
      active         = true
    where id = p_id
    returning id into v_id;
    perform public.class_template_purge(v_id);
  end if;
  return v_id;
end;
$$;

-- Stop a weekly class. Future unbooked occurrences go; booked ones stay so staff
-- can cancel them on purpose (which tells the clients).
create or replace function public.class_template_end(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sede text := (select sede_id from public.class_templates where id = p_id);
begin
  if v_sede is null or not public.staff_can_sede('schedule.write', v_sede) then
    raise exception 'NOT_ALLOWED';
  end if;
  update public.class_templates set active = false where id = p_id;
  perform public.class_template_purge(p_id);
end;
$$;

-- Create a one-off class (p_id null) or change one occurrence.
create or replace function public.class_save(p_id uuid, p_class jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old    public.classes;
  v_sede   text;
  v_disc   uuid := (p_class ->> 'discipline_id')::uuid;
  v_salon  uuid := (p_class ->> 'salon_id')::uuid;
  v_coach  uuid := nullif(p_class ->> 'coach_staff_id', '')::uuid;
  v_start  timestamptz := (p_class ->> 'starts_at')::timestamptz;
  v_end    timestamptz := (p_class ->> 'ends_at')::timestamptz;
  v_cap    integer := nullif(p_class ->> 'capacity', '')::integer;
  v_salcap integer;
  v_booked integer := 0;
  v_id     uuid;
begin
  if p_id is not null then
    select * into v_old from public.classes where id = p_id for update;
    if v_old.id is null then raise exception 'NOT_ALLOWED'; end if;
    v_sede := v_old.sede_id;
  else
    v_sede := p_class ->> 'sede_id';
  end if;
  if not public.staff_can_sede('schedule.write', v_sede) then
    raise exception 'NOT_ALLOWED';
  end if;
  select capacity into v_salcap from public.salones where id = v_salon and sede_id = v_sede and active;
  if v_salcap is null then raise exception 'SALON_NOT_IN_SEDE'; end if;
  if not exists (select 1 from public.disciplines where id = v_disc and active) then
    raise exception 'DISCIPLINE_NOT_AVAILABLE';
  end if;
  if v_coach is not null and not exists (
    select 1 from public.staff s join public.staff_sedes ss on ss.staff_id = s.id
    where s.id = v_coach and s.active and ss.sede_id = v_sede) then
    raise exception 'COACH_NOT_IN_SEDE';
  end if;
  if v_start is null or v_end is null or v_start <= now() then
    raise exception 'CLASS_IN_THE_PAST';
  end if;
  v_cap := least(coalesce(v_cap, (select default_capacity from public.disciplines where id = v_disc), v_salcap), v_salcap);

  if p_id is null then
    insert into public.classes (sede_id, discipline_id, salon_id, coach_staff_id, starts_at, ends_at, capacity)
    values (v_sede, v_disc, v_salon, v_coach, v_start, v_end, v_cap)
    returning id into v_id;
  else
    if v_old.status = 'cancelled' then raise exception 'CLASS_CANCELLED'; end if;
    select count(*) into v_booked from public.class_reservations where class_id = p_id and status = 'booked';
    if v_booked > v_cap then raise exception 'CAPACITY_BELOW_BOOKED'; end if;
    -- It keeps its template_slot, so the template never regenerates the slot it
    -- was moved from.
    update public.classes set
      discipline_id = v_disc, salon_id = v_salon, coach_staff_id = v_coach,
      starts_at = v_start, ends_at = v_end, capacity = v_cap
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Cancel one occurrence; its reservations are cancelled with it.
create or replace function public.class_cancel(p_id uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class public.classes;
  v_staff uuid := public.current_staff_id();
  n integer;
begin
  select * into v_class from public.classes where id = p_id for update;
  if v_class.id is null or not public.staff_can_sede('schedule.write', v_class.sede_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if v_class.status = 'cancelled' then raise exception 'CLASS_CANCELLED'; end if;
  update public.classes
    set status = 'cancelled', cancel_reason = nullif(btrim(coalesce(p_reason, '')), '')
    where id = p_id;
  update public.class_reservations
    set status = 'cancelled', cancelled_at = now(), cancelled_by_staff = v_staff, attended_at = null
    where class_id = p_id and status = 'booked';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- 10. Reservation writes -------------------------------------------------------------------
-- The client books for themself (p_client_id null or their own), or staff with
-- reservations.write book for a client of their sede. Capacity is checked under a
-- lock on the sede row, so concurrent bookings of the same sede queue up.
create or replace function public.reservation_book(p_class_id uuid, p_client_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_own    uuid := public.own_client_id();
  v_client uuid := coalesce(p_client_id, v_own);
  v_staff  uuid := public.current_staff_id();
  v_class  public.classes;
  v_sede   public.sedes;
  v_status text;
  v_booked integer;
  v_id     uuid;
  v_by_staff boolean;
begin
  select * into v_class from public.classes where id = p_class_id;
  if v_class.id is null or v_client is null then raise exception 'NOT_ALLOWED'; end if;

  v_by_staff := v_own is null or v_client <> v_own;
  if v_by_staff then
    if not public.staff_can_client('reservations.write', v_client)
       or not public.staff_can_sede('reservations.write', v_class.sede_id) then
      raise exception 'NOT_ALLOWED';
    end if;
  end if;

  -- Serialize every booking of this sede.
  select * into v_sede from public.sedes where id = v_class.sede_id for update;
  select * into v_class from public.classes where id = p_class_id for update;

  if (select sede_id from public.clients where id = v_client) <> v_class.sede_id then
    raise exception 'OTHER_SEDE';
  end if;
  if v_class.status <> 'scheduled' then raise exception 'CLASS_CANCELLED'; end if;
  if v_by_staff then
    if v_class.ends_at <= now() then raise exception 'CLASS_OVER'; end if;
  else
    if v_sede.status <> 'open' then raise exception 'SEDE_NOT_OPEN'; end if;
    if v_class.starts_at <= now() then raise exception 'CLASS_STARTED'; end if;
    if (v_class.starts_at at time zone 'America/Costa_Rica')::date
       > public.today_cr() + public.setting_int('reservations.book_ahead_days', 7) then
      raise exception 'TOO_FAR_AHEAD';
    end if;
  end if;

  select status into v_status from public.membership_overview where client_id = v_client;
  if coalesce(v_status, 'none') not in ('active', 'overdue') then
    raise exception 'MEMBERSHIP_INACTIVE';
  end if;

  if exists (select 1 from public.class_reservations
             where class_id = p_class_id and client_id = v_client and status = 'booked') then
    raise exception 'ALREADY_BOOKED';
  end if;

  select count(*) into v_booked from public.class_reservations where class_id = p_class_id and status = 'booked';
  if v_booked >= v_class.capacity then raise exception 'CLASS_FULL'; end if;
  if public.sede_booked_between(v_class.sede_id, v_class.starts_at, v_class.ends_at) >= v_sede.building_capacity then
    raise exception 'BUILDING_FULL';
  end if;

  insert into public.class_reservations (class_id, client_id, booked_by_staff, updated_by_staff)
  values (p_class_id, v_client, case when v_by_staff then v_staff end, case when v_by_staff then v_staff end)
  returning id into v_id;
  return v_id;
end;
$$;

-- The client cancels their own up to the cutoff; staff cancel anytime before the end.
create or replace function public.reservation_cancel(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res   public.class_reservations;
  v_class public.classes;
  v_own   uuid := public.own_client_id();
  v_staff uuid := public.current_staff_id();
begin
  select * into v_res from public.class_reservations where id = p_reservation_id for update;
  if v_res.id is null then raise exception 'NOT_ALLOWED'; end if;
  select * into v_class from public.classes where id = v_res.class_id;

  if v_own is not null and v_res.client_id = v_own then
    if v_class.starts_at - make_interval(hours => public.setting_int('reservations.cancel_cutoff_hours', 2)) < now() then
      raise exception 'PAST_CUTOFF';
    end if;
    v_staff := null;
  elsif not public.staff_can_client('reservations.write', v_res.client_id) then
    raise exception 'NOT_ALLOWED';
  elsif v_class.ends_at <= now() then
    raise exception 'CLASS_OVER';
  end if;
  if v_res.status <> 'booked' then raise exception 'ALREADY_CANCELLED'; end if;

  update public.class_reservations
    set status = 'cancelled', cancelled_at = now(), cancelled_by_staff = v_staff,
        attended_at = null, updated_by_staff = v_staff
    where id = p_reservation_id;
end;
$$;

-- Staff mark (or unmark) attendance at the desk, on the day of the class.
create or replace function public.reservation_set_attended(p_reservation_id uuid, p_attended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res   public.class_reservations;
  v_class public.classes;
begin
  select * into v_res from public.class_reservations where id = p_reservation_id for update;
  if v_res.id is null or not public.staff_can_client('reservations.write', v_res.client_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if v_res.status <> 'booked' then raise exception 'ALREADY_CANCELLED'; end if;
  select * into v_class from public.classes where id = v_res.class_id;
  if (v_class.starts_at at time zone 'America/Costa_Rica')::date <> public.today_cr() then
    raise exception 'NOT_TODAY';
  end if;
  update public.class_reservations
    set attended_at = case when p_attended then coalesce(attended_at, now()) end,
        updated_by_staff = public.current_staff_id()
    where id = p_reservation_id;
end;
$$;

-- 11. Audit triggers -----------------------------------------------------------------------
drop trigger if exists stamp_staff_audit on public.salones;
create trigger stamp_staff_audit before insert or update on public.salones
  for each row execute function public.stamp_staff_audit();
drop trigger if exists stamp_staff_audit on public.disciplines;
create trigger stamp_staff_audit before insert or update on public.disciplines
  for each row execute function public.stamp_staff_audit();
drop trigger if exists stamp_staff_audit on public.class_templates;
create trigger stamp_staff_audit before insert or update on public.class_templates
  for each row execute function public.stamp_staff_audit();
drop trigger if exists stamp_staff_audit on public.classes;
create trigger stamp_staff_audit before insert or update on public.classes
  for each row execute function public.stamp_staff_audit();
drop trigger if exists touch_class_reservations on public.class_reservations;
create trigger touch_class_reservations before update on public.class_reservations
  for each row execute function public.touch_updated_at();

-- 12. RLS ---------------------------------------------------------------------------------
alter table public.salones            enable row level security;
alter table public.disciplines        enable row level security;
alter table public.discipline_salons  enable row level security;
alter table public.class_templates    enable row level security;
alter table public.classes            enable row level security;
alter table public.class_reservations enable row level security;

-- Names of rooms and disciplines are not private.
drop policy if exists "signed in reads salones" on public.salones;
create policy "signed in reads salones" on public.salones for select to authenticated using (true);
drop policy if exists "settings staff add salones" on public.salones;
create policy "settings staff add salones" on public.salones for insert to authenticated
  with check (public.staff_can_sede('settings.manage', sede_id));
drop policy if exists "settings staff edit salones" on public.salones;
create policy "settings staff edit salones" on public.salones for update to authenticated
  using (public.staff_can_sede('settings.manage', sede_id))
  with check (public.staff_can_sede('settings.manage', sede_id));

drop policy if exists "signed in reads disciplines" on public.disciplines;
create policy "signed in reads disciplines" on public.disciplines for select to authenticated using (true);
drop policy if exists "settings staff add disciplines" on public.disciplines;
create policy "settings staff add disciplines" on public.disciplines for insert to authenticated
  with check (coalesce(public.staff_can('settings.manage'), false));
drop policy if exists "settings staff edit disciplines" on public.disciplines;
create policy "settings staff edit disciplines" on public.disciplines for update to authenticated
  using (coalesce(public.staff_can('settings.manage'), false))
  with check (coalesce(public.staff_can('settings.manage'), false));

drop policy if exists "signed in reads discipline salons" on public.discipline_salons;
create policy "signed in reads discipline salons" on public.discipline_salons for select to authenticated using (true);
drop policy if exists "settings staff set discipline salons" on public.discipline_salons;
create policy "settings staff set discipline salons" on public.discipline_salons for insert to authenticated
  with check (public.staff_can_sede('settings.manage', sede_id));
drop policy if exists "settings staff change discipline salons" on public.discipline_salons;
create policy "settings staff change discipline salons" on public.discipline_salons for update to authenticated
  using (public.staff_can_sede('settings.manage', sede_id))
  with check (public.staff_can_sede('settings.manage', sede_id));
drop policy if exists "settings staff unset discipline salons" on public.discipline_salons;
create policy "settings staff unset discipline salons" on public.discipline_salons for delete to authenticated
  using (public.staff_can_sede('settings.manage', sede_id));

-- The weekly schedule: staff of the sede. Classes: staff of the sede and its
-- clients (for their reservations list; spots come from class_slots()).
drop policy if exists "staff reads templates" on public.class_templates;
create policy "staff reads templates" on public.class_templates for select to authenticated
  using (sede_id in (select public.staff_sede_ids()));
drop policy if exists "staff or clients read classes" on public.classes;
create policy "staff or clients read classes" on public.classes for select to authenticated
  using (sede_id in (select public.staff_sede_ids()) or sede_id = (select public.own_client_sede()));

drop policy if exists "reads own or sede reservations" on public.class_reservations;
create policy "reads own or sede reservations" on public.class_reservations for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('clients.read', client_id));

-- 13. Grants -------------------------------------------------------------------------------
revoke all on public.salones, public.disciplines, public.discipline_salons,
  public.class_templates, public.classes, public.class_reservations from public, anon, authenticated;

grant select on public.salones, public.disciplines, public.discipline_salons,
  public.class_templates, public.classes, public.class_reservations to authenticated;
grant insert (sede_id, name, capacity, sort_order, active) on public.salones to authenticated;
grant update (name, capacity, sort_order, active) on public.salones to authenticated;
grant insert (slug, name, default_capacity, default_minutes, sort_order, active) on public.disciplines to authenticated;
grant update (name, default_capacity, default_minutes, sort_order, active) on public.disciplines to authenticated;
grant insert, delete on public.discipline_salons to authenticated;
grant update (salon_id) on public.discipline_salons to authenticated;

grant all on public.salones, public.disciplines, public.discipline_salons,
  public.class_templates, public.classes, public.class_reservations to service_role;

-- 14. Function privileges ------------------------------------------------------------------
revoke execute on function
  public.staff_can_sede(text, text), public.own_client_sede(),
  public.classes_ensure(text, date, date), public.class_template_purge(uuid),
  public.sede_booked_between(text, timestamptz, timestamptz),
  public.class_slots(text, date, uuid), public.public_schedule(text, date, integer),
  public.occupancy_now(text), public.class_template_save(uuid, jsonb), public.class_template_end(uuid),
  public.class_save(uuid, jsonb), public.class_cancel(uuid, text),
  public.reservation_book(uuid, uuid), public.reservation_cancel(uuid),
  public.reservation_set_attended(uuid, boolean)
  from public, anon;
-- Internal: only the functions above call these.
revoke execute on function
  public.classes_ensure(text, date, date), public.class_template_purge(uuid), public.sede_booked_between(text, timestamptz, timestamptz),
  public.guard_discipline_salon()
  from public, anon, authenticated;
grant execute on function
  public.staff_can_sede(text, text), public.own_client_sede(),
  public.class_slots(text, date, uuid), public.public_schedule(text, date, integer),
  public.occupancy_now(text), public.class_template_save(uuid, jsonb), public.class_template_end(uuid),
  public.class_save(uuid, jsonb), public.class_cancel(uuid, text),
  public.reservation_book(uuid, uuid), public.reservation_cancel(uuid),
  public.reservation_set_attended(uuid, boolean)
  to authenticated, service_role;
grant execute on function public.public_schedule(text, date, integer) to anon;
