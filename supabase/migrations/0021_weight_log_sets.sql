-- 0021_weight_log_sets.sql
-- Turns the weight record into a real training log: a set is a weight AND the
-- reps done at it, and one session holds several of them.
--
-- Depends on 0019_exercise_weight_log.sql + 0020_client_logs_own_weight.sql.
--
-- Why: one number per exercise cannot say "275 × 4, then 220 × 12" — which is
-- how people actually train, and the whole reason this replaces a notebook.
--
-- What this changes about who writes here: the log is now the CLIENT's record
-- of what they lifted. The coach's prescribed load stays where it was, on
-- routine_items.weight, and no longer writes an entry here — mixing a
-- prescription into the training log made both harder to read. The coach still
-- READS this table (policy from 0019) to see what their client is moving.

-- 1. Reps -------------------------------------------------------------------

-- Nullable: "I did 100 kg" with no rep count is still worth recording, and
-- forcing a number would make the fast path slower for no gain.
alter table public.exercise_weight_logs
  add column if not exists reps integer;

alter table public.exercise_weight_logs
  drop constraint if exists exercise_weight_logs_reps_ck;

alter table public.exercise_weight_logs
  add constraint exercise_weight_logs_reps_ck
  check (reps is null or (reps > 0 and reps <= 999));

comment on column public.exercise_weight_logs.reps is
  'Reps performed at this weight. NULL = the weight was logged without a rep count.';

comment on table public.exercise_weight_logs is
  'The client''s training log: one row per set (weight + reps), several per session. Written by the client; readable by their coach.';

-- 2. Correcting a mistyped set ----------------------------------------------

-- Several sets now land within minutes of each other, so the app can no longer
-- treat a second entry as a correction of the first — it has to be a new row.
-- That makes an explicit way to remove a wrong entry necessary, where before a
-- re-save silently replaced it.
--
-- Scoped to entries the client wrote themselves, which today is all of theirs.
drop policy if exists "client deletes own weight logs" on public.exercise_weight_logs;
create policy "client deletes own weight logs"
  on public.exercise_weight_logs for delete
  to authenticated
  using (client_id = auth.uid() and logged_by = auth.uid());
