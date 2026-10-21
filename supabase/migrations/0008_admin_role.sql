-- 0008: add the ADMIN role (platform owner).
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0001_profiles.sql (user_role enum, profiles.role).
--
-- Role model after this migration:
--   admin  → platform owner. The ONLY role that can pre-authorize coaches.
--   coach  → independent trainer. Can pre-authorize their OWN clients only.
--   client → belongs to exactly one coach (profiles.coach_id).
--
-- No coach ever manages another coach: the ledger in 0009 makes that
-- shape impossible to write, not merely forbidden by the app.
--
-- The drift warnings in 0006 (role/status/training_type as text) describe the
-- ORIGINAL Sport Lab database. This project was rebuilt from these files in
-- order, so profiles.role really is the user_role enum here — verified before
-- writing this file. Everything below is therefore enum-native.
--
-- TRANSACTIONS: a new enum label may not be USED in the transaction that adds
-- it. Nothing in this file compares an enum column against 'admin' — is_admin
-- casts to text — so the file is safe to run as one script.

-- 1. Enum value ------------------------------------------------------------
alter type public.user_role add value if not exists 'admin';

-- 2. Helper: is the current user the platform admin? -----------------------
-- security definer so it can read profiles without tripping that table's RLS
-- (same pattern as is_coach()).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role::text = 'admin'   -- ::text: see the transaction note above
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
