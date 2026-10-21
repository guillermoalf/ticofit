-- Fase A: full portal schema (finances, exercises, programs,
-- routines, visits, measurements, evidence photos) + RLS on every table.
-- Run in the Supabase SQL editor. Idempotent so it's safe to re-run.
-- Depends on 0001_profiles.sql + 0002_roster.sql (profiles, user_role,
-- is_coach(), coach_id ownership on profiles).
--
-- Access model:
--   * Coach: full CRUD on rows they own (coach_id = auth.uid()) or that
--     belong to one of their clients (profiles.coach_id = auth.uid()).
--   * Client: SELECT only on their own routines, routine_items, measurements,
--     evidence_photos, and exercises referenced by their routines (needed to
--     render the routine).
--   * Financial data (clients_meta, visits incl. cost) has NO client policies
--     at all — with RLS enabled and no matching policy, clients are denied.
--
-- ORDER: enums → tables → helper functions → RLS policies
-- (functions referencing tables must come after those tables are created)

-- 1. Enums ------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('al_dia', 'por_vencer', 'vencido');
  end if;
  if not exists (select 1 from pg_type where typname = 'procedure_type') then
    create type procedure_type as enum ('medicion', 'rutina', 'fisioterapia', 'otro');
  end if;
end $$;

-- 2. Tables -----------------------------------------------------------------
-- All tables first, so helper functions can reference them without error.

-- 2a. clients_meta — coach-only financial fields, 1:1 with a client profile
create table if not exists public.clients_meta (
  client_id         uuid primary key references public.profiles (id) on delete cascade,
  monthly_fee       numeric(10, 2),
  join_date         date,
  next_payment_date date,
  payment_status    payment_status not null default 'al_dia',
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 2b. exercises — the coach's exercise + explainer video library
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  category     text,
  youtube_url  text,
  is_explainer boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists exercises_coach_id_idx on public.exercises (coach_id);

-- 2c. programs + program_items — reusable templates (coach-only)
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create index if not exists programs_coach_id_idx on public.programs (coach_id);

create table if not exists public.program_items (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  day_label   text not null default 'Día 1',
  order_index integer not null default 0,
  sets        text,
  reps        text,
  notes       text
);

create index if not exists program_items_program_id_idx
  on public.program_items (program_id, day_label, order_index);

-- 2d. routines + routine_items — per-client snapshot the client actually sees
create table if not exists public.routines (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.profiles (id) on delete cascade,
  coach_id          uuid not null references public.profiles (id) on delete cascade,
  name              text not null,
  assigned_at       timestamptz not null default now(),
  source_program_id uuid references public.programs (id) on delete set null
);

create index if not exists routines_client_id_idx on public.routines (client_id);
create index if not exists routines_coach_id_idx  on public.routines (coach_id);

create table if not exists public.routine_items (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references public.routines (id) on delete cascade,
  -- restrict: deleting a library exercise must not silently gut an active routine
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  day_label   text not null default 'Día 1',
  order_index integer not null default 0,
  sets        text,
  reps        text,
  notes       text
);

create index if not exists routine_items_routine_id_idx
  on public.routine_items (routine_id, day_label, order_index);
create index if not exists routine_items_exercise_id_idx
  on public.routine_items (exercise_id);

-- 2e. visits — financial + history record (coach-only)
create table if not exists public.visits (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.profiles (id) on delete cascade,
  coach_id       uuid not null references public.profiles (id) on delete cascade,
  visit_date     date not null default current_date,
  procedure_type procedure_type not null,
  cost           numeric(10, 2),
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists visits_client_id_idx on public.visits (client_id, visit_date desc);
create index if not exists visits_coach_id_idx  on public.visits (coach_id, visit_date desc);

-- 2f. measurements — drives the client progress charts
create table if not exists public.measurements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  visit_id    uuid references public.visits (id) on delete set null,
  measured_at timestamptz not null default now(),
  weight      numeric(6, 2),
  muscle_pct  numeric(5, 2),
  fat_pct     numeric(5, 2)
);

create index if not exists measurements_client_id_idx
  on public.measurements (client_id, measured_at desc);

-- 2g. evidence_photos — coach-uploaded progress photos
create table if not exists public.evidence_photos (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles (id) on delete cascade,
  visit_id     uuid references public.visits (id) on delete set null,
  storage_path text not null,
  uploaded_at  timestamptz not null default now()
);

create index if not exists evidence_photos_client_id_idx
  on public.evidence_photos (client_id, uploaded_at desc);

-- 3. Helper functions -------------------------------------------------------
-- Defined AFTER the tables they reference so PostgreSQL can validate them.
-- All use security definer so RLS policies on child tables don't recurse.

-- Keep updated_at fresh (no table dependency — safe to define early or here).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_clients_meta on public.clients_meta;
create trigger touch_clients_meta
  before update on public.clients_meta
  for each row execute function public.touch_updated_at();

-- Does the current user (a coach) own this client?
create or replace function public.is_own_client(p_client uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_client
      and coach_id = auth.uid()
      and role = 'client'
  );
$$;

-- Does the current user coach this routine?
create or replace function public.routine_owned_by_coach(p_routine uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.routines
    where id = p_routine and coach_id = auth.uid()
  );
$$;

-- Is the current user the client this routine was assigned to?
create or replace function public.routine_belongs_to_client(p_routine uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.routines
    where id = p_routine and client_id = auth.uid()
  );
$$;

-- Does the current user own this program?
create or replace function public.program_owned_by_coach(p_program uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.programs
    where id = p_program and coach_id = auth.uid()
  );
$$;

-- Is this exercise referenced by any routine assigned to the current user?
create or replace function public.exercise_in_client_routine(p_exercise uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.routine_items ri
    join public.routines r on r.id = ri.routine_id
    where ri.exercise_id = p_exercise
      and r.client_id = auth.uid()
  );
$$;

-- 4. Enable RLS on every table ----------------------------------------------
alter table public.clients_meta    enable row level security;
alter table public.exercises       enable row level security;
alter table public.programs        enable row level security;
alter table public.program_items   enable row level security;
alter table public.routines        enable row level security;
alter table public.routine_items   enable row level security;
alter table public.visits          enable row level security;
alter table public.measurements    enable row level security;
alter table public.evidence_photos enable row level security;

-- 5. RLS policies -----------------------------------------------------------

-- clients_meta: coach-only (no client policies — clients cannot see finances)
drop policy if exists "coach manages own clients meta" on public.clients_meta;
create policy "coach manages own clients meta"
  on public.clients_meta for all
  using (public.is_own_client(client_id))
  with check (public.is_own_client(client_id));

-- exercises
drop policy if exists "coach manages own exercises" on public.exercises;
create policy "coach manages own exercises"
  on public.exercises for all
  using (coach_id = auth.uid())
  with check (public.is_coach() and coach_id = auth.uid());

drop policy if exists "client reads exercises in own routines" on public.exercises;
create policy "client reads exercises in own routines"
  on public.exercises for select
  using (public.exercise_in_client_routine(id));

drop policy if exists "client reads coach explainers" on public.exercises;
create policy "client reads coach explainers"
  on public.exercises for select
  using (
    is_explainer
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.coach_id = exercises.coach_id
    )
  );

-- programs
drop policy if exists "coach manages own programs" on public.programs;
create policy "coach manages own programs"
  on public.programs for all
  using (coach_id = auth.uid())
  with check (public.is_coach() and coach_id = auth.uid());

-- program_items
drop policy if exists "coach manages own program items" on public.program_items;
create policy "coach manages own program items"
  on public.program_items for all
  using (public.program_owned_by_coach(program_id))
  with check (public.program_owned_by_coach(program_id));

-- routines
drop policy if exists "coach manages own routines" on public.routines;
create policy "coach manages own routines"
  on public.routines for all
  using (coach_id = auth.uid())
  with check (
    public.is_coach()
    and coach_id = auth.uid()
    and public.is_own_client(client_id)
  );

drop policy if exists "client reads own routines" on public.routines;
create policy "client reads own routines"
  on public.routines for select
  using (client_id = auth.uid());

-- routine_items
drop policy if exists "coach manages own routine items" on public.routine_items;
create policy "coach manages own routine items"
  on public.routine_items for all
  using (public.routine_owned_by_coach(routine_id))
  with check (public.routine_owned_by_coach(routine_id));

drop policy if exists "client reads own routine items" on public.routine_items;
create policy "client reads own routine items"
  on public.routine_items for select
  using (public.routine_belongs_to_client(routine_id));

-- visits: coach-only (no client policies — clients cannot see cost)
drop policy if exists "coach manages own visits" on public.visits;
create policy "coach manages own visits"
  on public.visits for all
  using (coach_id = auth.uid())
  with check (
    public.is_coach()
    and coach_id = auth.uid()
    and public.is_own_client(client_id)
  );

-- measurements
drop policy if exists "coach manages client measurements" on public.measurements;
create policy "coach manages client measurements"
  on public.measurements for all
  using (public.is_own_client(client_id))
  with check (public.is_own_client(client_id));

drop policy if exists "client reads own measurements" on public.measurements;
create policy "client reads own measurements"
  on public.measurements for select
  using (client_id = auth.uid());

-- evidence_photos
drop policy if exists "coach manages client evidence" on public.evidence_photos;
create policy "coach manages client evidence"
  on public.evidence_photos for all
  using (public.is_own_client(client_id))
  with check (public.is_own_client(client_id));

drop policy if exists "client reads own evidence" on public.evidence_photos;
create policy "client reads own evidence"
  on public.evidence_photos for select
  using (client_id = auth.uid());
