-- 0012: bootstrap the platform owner.
-- Run in the Supabase SQL editor (no user JWT — that is what allows an
-- 'admin' ledger row; see the guard in 0009).
--
-- The owner is not an exception to invite-only, they are its first entry:
-- this inserts the one authorization nobody could have created from the app,
-- and then the owner signs in through exactly the same path as everyone
-- else.
--
-- ── THE ADMIN ADDRESS IS NOT STORED IN THIS FILE ──────────────────────────
-- No personal address is committed to the repository. Supply it at apply
-- time, either way:
--
--   A. Session setting (preferred — nothing to edit, nothing to revert):
--        select set_config('app.admin_email', 'you@example.com', false);
--        -- then run this file in the SAME SQL editor session.
--
--   B. Edit the placeholder below to your address, run the file, then
--      REVERT the edit before committing. Never commit a real address.
--
-- If neither is supplied the file raises and changes nothing, so a
-- forgotten address fails loudly instead of seeding a placeholder account.
--
-- ORDER OF OPERATIONS
--   1. Run this file (with the address supplied as above).
--   2. Sign in at /login with that Google account (or set a password later).
--      0010's trigger consumes this row and creates the profile with
--      role = 'admin', authorized = true.
--   3. /portal now dispatches to the admin screen, where you authorize your
--      first coach.
--
-- Re-running is safe: the partial unique index refuses a second pending row
-- for the same address, and once consumed the insert is skipped.

do $$
declare
  -- Option A wins when set; otherwise fall back to the option-B placeholder
  -- on the next line, which is the ONLY line to edit for option B.
  v_raw   text := coalesce(
                    nullif(current_setting('app.admin_email', true), ''),
                    'REPLACE_WITH_ADMIN_EMAIL'
                  );
  v_email text := lower(trim(v_raw));
begin
  if v_email = '' or v_email = 'replace_with_admin_email' then
    raise exception using
      errcode = '22023',
      message = 'No admin email supplied.',
      hint    = 'Run: select set_config(''app.admin_email'', ''you@example.com'', false); in this same session, then re-run 0012. See the header of this file.';
  end if;

  if position('@' in v_email) < 2 then
    raise exception using
      errcode = '22023',
      message = format('%L is not a valid email address', v_email);
  end if;

  if exists (select 1 from public.profiles where lower(email) = v_email and role::text = 'admin') then
    raise notice '% is already an admin — nothing to do', v_email;
    return;
  end if;

  insert into public.preauthorized_emails (email, intended_role, full_name)
  values (v_email, 'admin', null)
  on conflict do nothing;

  raise notice 'Authorized % as admin. Sign in at /login to claim it.', v_email;
end $$;

-- Verify (after signing in):
--   select email, role, authorized from public.profiles where role::text = 'admin';
