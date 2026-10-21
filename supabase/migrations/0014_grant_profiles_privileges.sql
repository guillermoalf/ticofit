-- 0014: grant the missing DML privileges on public.profiles.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0001_profiles.sql.
--
-- THE BUG THIS FIXES
--   0005 exists precisely because raw SQL migrations get no automatic grants
--   the way dashboard-created tables do — but it lists only the tables from
--   0003, and profiles was created back in 0001. It was never granted.
--
--   `authenticated` therefore held only REFERENCES/TRIGGER/TRUNCATE on the
--   one table every signed-in request reads. RLS never got a chance to run:
--   Postgres refuses at the privilege layer first, so requireProfile() —
--   and with it every portal page — fails with "permission denied for table
--   profiles" for real users. Nothing caught it earlier because the trigger
--   that writes profiles is SECURITY DEFINER (it runs as the owner) and
--   every server action that touches the table on the coach's behalf uses
--   the service role, which was granted.
--
--   Found by running the invite-only cascade end to end against the applied
--   schema: the admin could authorize a coach but could not then read the
--   coach's account back.
--
-- SAFETY
--   Grants are not policies. profiles has RLS enabled with per-role policies
--   (0001 read/update self, 0002 coach-owns-clients, 0013 admin), and those
--   still decide which ROWS are visible. This only restores the table-level
--   privilege that lets those policies be evaluated at all.
--   anon is deliberately left with nothing.

grant select, insert, update, delete on public.profiles to authenticated;
grant all                            on public.profiles to service_role;

-- Verify:
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_schema = 'public' and table_name = 'profiles'
--      and grantee in ('anon','authenticated','service_role')
--    order by grantee, privilege_type;
