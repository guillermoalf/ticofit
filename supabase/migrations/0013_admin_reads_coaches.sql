-- 0013: let the admin actually see and suspend coaches.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0008 (is_admin) and 0010 (profiles.authorized).
--
-- WHY THIS EXISTS
--   0009 gave the admin RLS on the ledger, and 0010 gave profiles the
--   `authorized` switch — but nothing ever gave the admin a policy on
--   PROFILES itself. The only policies there are "read own profile" and the
--   coach's own-clients pair, so the platform owner could read the
--   authorizations they wrote and still not see the accounts those
--   authorizations produced, nor flip anyone's access.
--
--   The admin screen (/portal/admin) needs both: it joins each ledger row to
--   the account it created (pending vs. active) and toggles
--   profiles.authorized to suspend or restore a coach.
--
-- SCOPE
--   Reading is platform-wide — the owner supports every account on the
--   instance. Writing is deliberately narrower: coaches only. The admin has
--   no UPDATE path to a client row here (that stays the owning coach's job
--   via 0002's policies) and none to another admin, so this file cannot be
--   used to suspend the platform owner out of their own instance.
--
--   Role escalation is still blocked independently by 0010's
--   guard_protected_fields(): 'admin' can never be assigned from a session
--   holding a user JWT, whoever they are.

-- 1. Read -------------------------------------------------------------------
drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

-- 2. Suspend / restore a coach ---------------------------------------------
-- Both USING and WITH CHECK pin role = 'coach', so the row must be a coach
-- before the update AND still be one after it: the admin cannot use this
-- policy to change what someone is, only whether they may enter.
-- ::text so the comparison never depends on enum label ordering (see 0008).
drop policy if exists "admin updates coach access" on public.profiles;
create policy "admin updates coach access"
  on public.profiles for update
  to authenticated
  using (public.is_admin() and role::text = 'coach')
  with check (public.is_admin() and role::text = 'coach');

-- Verify:
--   set role authenticated;  -- with an admin JWT
--   select count(*) from public.profiles where role::text = 'coach';
