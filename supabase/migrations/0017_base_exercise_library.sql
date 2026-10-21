-- 0017_base_exercise_library.sql
-- Shared BASE exercise library: every coach starts with a system-owned set of
-- exercises they can use immediately, on top of their own private library.
--
-- Depends on 0003_portal_foundation.sql (exercises, routine_items,
-- exercise_in_client_routine()) and 0010_invite_only.sql (is_coach()).
--
-- Model
--   source = 'coach'  -> coach_id NOT NULL, slug NULL   (private, editable)
--   source = 'system' -> coach_id NULL,     slug NOT NULL (shared, read-only)
--
-- Existing rows are all coach-owned, so the column default backfills them
-- correctly and no routine/program reference changes. routine_items and
-- program_items point at exercises.id and never at coach_id, so nothing
-- downstream is touched.

-- 1. Columns ----------------------------------------------------------------

-- Text + CHECK rather than an enum: two values that the app compares as
-- strings, and adding a third later must not need an ALTER TYPE.
alter table public.exercises
  add column if not exists source text not null default 'coach';

-- Stable dedup key for system rows so re-running the seed is idempotent.
-- Always NULL for coach rows: two coaches may legitimately both own a
-- "Sentadilla búlgara" and must not collide.
alter table public.exercises
  add column if not exists slug text;

-- NULL coach_id is what makes a row shared: it belongs to no coach.
alter table public.exercises
  alter column coach_id drop not null;

-- 2. Invariants -------------------------------------------------------------

-- One constraint keeps source, ownership and slug from ever drifting apart.
-- It is also the reason a coach cannot forge a system row: setting
-- source='system' requires coach_id NULL, which the RLS WITH CHECK below
-- rejects.
alter table public.exercises
  drop constraint if exists exercises_source_ownership_ck;

alter table public.exercises
  add constraint exercises_source_ownership_ck check (
    (source = 'coach'  and coach_id is not null and slug is null)
    or
    (source = 'system' and coach_id is null     and slug is not null)
  );

-- Idempotent seeding: one system row per slug.
create unique index if not exists exercises_system_slug_key
  on public.exercises (slug)
  where source = 'system';

-- Every coach reads the whole system set on every library/builder load.
create index if not exists exercises_system_name_idx
  on public.exercises (name)
  where source = 'system';

comment on column public.exercises.source is
  'coach = private row owned by coach_id. system = shared base library row (coach_id NULL, identified by slug), read-only to coaches.';
comment on column public.exercises.slug is
  'Dedup key for system rows only; NULL for coach rows.';

-- 3. RLS --------------------------------------------------------------------

-- The existing "coach manages own exercises" (FOR ALL) policy is left as-is
-- and already does the right thing for system rows: coach_id = auth.uid()
-- evaluates to NULL — never true — when coach_id is NULL, so a coach can
-- neither UPDATE nor DELETE a system exercise. Its WITH CHECK likewise blocks
-- INSERTing one (coach_id would have to be NULL).
--
-- Read access for the base library is granted additively here.
drop policy if exists "coach reads system exercises" on public.exercises;
create policy "coach reads system exercises"
  on public.exercises for select
  to authenticated
  using (source = 'system' and public.is_coach());

-- Clients keep their existing read path unchanged: "client reads exercises in
-- own routines" matches on exercise_in_client_routine(id), which joins
-- routine_items -> routines by exercise id and never looks at coach_id, so a
-- system exercise inside an assigned routine is readable exactly like a
-- coach-owned one.

-- 4. Seeding ----------------------------------------------------------------
-- System rows are inserted by a later migration running as the migration role,
-- which bypasses RLS. No INSERT policy for system rows is granted to anyone.
