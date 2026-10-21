-- 0019_exercise_weight_log.sql
-- Per-client working weight on routine exercises, plus the history that makes
-- it useful: the next time a client trains chest the coach sees what was
-- logged last time and can raise or lower it from there.
--
-- Depends on 0003_portal_foundation.sql (routine_items, routines, profiles,
-- is_own_client()) and 0010_invite_only.sql (is_coach()).
--
-- Model
--   routine_items.weight       -> the weight prescribed RIGHT NOW for that item
--   exercise_weight_logs       -> the append-only record of what was prescribed
--                                 over time, keyed by (client, exercise)
--
-- Weight lives on routine_items and NOT on program_items on purpose: a program
-- is a template reused across clients, while a working weight is personal to
-- one client. Assigning a program therefore copies sets/reps/notes and leaves
-- weight empty, which the builder then backfills from the client's history.

-- 1. Prescribed weight ------------------------------------------------------

-- Numeric, unlike the free-text sets/reps: comparing loads over time is the
-- whole point, and "subir o bajar el peso" needs arithmetic, not strings.
-- (6,2) covers 9999.99 — plenty for kg on any machine or bar.
alter table public.routine_items
  add column if not exists weight numeric(6, 2);

alter table public.routine_items
  drop constraint if exists routine_items_weight_ck;

alter table public.routine_items
  add constraint routine_items_weight_ck check (weight is null or weight >= 0);

comment on column public.routine_items.weight is
  'Working weight in kg prescribed for this routine item. NULL = not set (bodyweight, or the coach has not decided yet).';

-- 2. History ----------------------------------------------------------------

-- Keyed by (client_id, exercise_id) rather than by routine_item_id: the point
-- is to follow one client's load on one movement ACROSS routines, so a new
-- routine picks up where the previous one left off.
create table if not exists public.exercise_weight_logs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  -- Context only. A deleted routine must not erase the client's record of
  -- what they were lifting, so this nulls out instead of cascading.
  routine_id  uuid references public.routines (id) on delete set null,
  weight      numeric(6, 2) not null check (weight >= 0),
  logged_at   timestamptz not null default now(),
  -- Who wrote the entry (today always the coach; kept explicit so a future
  -- client-logged entry is distinguishable without a schema change).
  logged_by   uuid references public.profiles (id) on delete set null
);

-- The one query this table serves: latest entries for a client + exercise.
create index if not exists exercise_weight_logs_client_exercise_idx
  on public.exercise_weight_logs (client_id, exercise_id, logged_at desc);

comment on table public.exercise_weight_logs is
  'Append-only record of the weight prescribed for a client on an exercise, across routines. Drives the "última vez" hint and the per-exercise history.';

-- 3. RLS --------------------------------------------------------------------

alter table public.exercise_weight_logs enable row level security;

-- Coach: full control over the logs of their own clients. is_own_client() is
-- security definer, so this does not recurse through profiles' own policies.
drop policy if exists "coach manages client weight logs" on public.exercise_weight_logs;
create policy "coach manages client weight logs"
  on public.exercise_weight_logs for all
  to authenticated
  using (public.is_own_client(client_id))
  with check (public.is_own_client(client_id));

-- Client: read-only on their own record. Writing is the coach's job today —
-- mirrors measurements/evidence_photos, where the client sees but never edits.
drop policy if exists "client reads own weight logs" on public.exercise_weight_logs;
create policy "client reads own weight logs"
  on public.exercise_weight_logs for select
  to authenticated
  using (client_id = auth.uid());

-- 4. Grants -----------------------------------------------------------------
-- Matches 0005_grant_table_privileges.sql: RLS decides the rows, grants decide
-- that the role may touch the table at all.
grant select, insert, update, delete on public.exercise_weight_logs to authenticated;
grant all on public.exercise_weight_logs to service_role;
