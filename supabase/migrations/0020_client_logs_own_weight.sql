-- 0020_client_logs_own_weight.sql
-- Lets the CLIENT record what they actually lifted.
--
-- Depends on 0019_exercise_weight_log.sql (exercise_weight_logs + its RLS).
--
-- 0019 modelled weight as something the coach prescribes and the client only
-- reads. That is the wrong way around for the part that matters: the person
-- under the bar is the one who knows the number. So the two roles now write to
-- the same record and `logged_by` says which of them wrote each entry:
--
--   coach entry  -> the load prescribed in the routine (routine_items.weight)
--   client entry -> what they lifted that day
--
-- The client's read policy from 0019 is unchanged and still covers SELECT.

-- Insert: only into their OWN record, and only signed as themselves. Both
-- checks matter — client_id alone would let a client attribute an entry to the
-- coach, which is what the history panel labels entries by.
drop policy if exists "client logs own weight" on public.exercise_weight_logs;
create policy "client logs own weight"
  on public.exercise_weight_logs for insert
  to authenticated
  with check (client_id = auth.uid() and logged_by = auth.uid());

-- Update: a client may fix an entry THEY wrote (a typo, a corrected set), and
-- never one the coach wrote. USING and WITH CHECK are both constrained so the
-- row cannot be re-attributed on the way out.
drop policy if exists "client amends own weight logs" on public.exercise_weight_logs;
create policy "client amends own weight logs"
  on public.exercise_weight_logs for update
  to authenticated
  using (client_id = auth.uid() and logged_by = auth.uid())
  with check (client_id = auth.uid() and logged_by = auth.uid());

-- No DELETE policy for clients: correcting an entry is theirs to do, erasing
-- history is not. The coach's FOR ALL policy from 0019 still covers cleanup.
