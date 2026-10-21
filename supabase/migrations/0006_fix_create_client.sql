-- fix "Crear cliente": three independent defects on profiles.
-- Run in the Supabase SQL editor. Idempotent (SET DEFAULT overwrites, GRANT
-- and CREATE OR REPLACE are safe to re-run).
--
-- Defect 1 — missing default on profiles.role.
-- The live table drifted from 0001_profiles.sql. In the file, role is
-- `user_role not null default 'client'`; in the deployed database the column
-- is NOT NULL but has NO default. handle_new_user (0002) inserts only
-- (id, full_name, email), relying on that default, so every
-- auth.admin.createUser call aborted inside the trigger with
--   23502: null value in column "role" of relation "profiles"
-- which rolled back the auth.users insert and surfaced as a generic error.
--
-- Defect 2 — service_role has no privileges on profiles.
-- 0005 granted DML on every portal table EXCEPT profiles, so the admin
-- client used by createClientAction fails its follow-up profile update with
--   42501: permission denied for table profiles
-- (service_role bypasses RLS but still needs table-level GRANTs).
--
-- Defect 3 — guard_protected_fields blocks the service role.
-- The 0002 guard only exempts coaches (is_coach()), but a service-role
-- request carries no user JWT: auth.uid() is null, is_coach() is false, and
-- the trigger rejects the server's own trusted update of role/coach_id/status
-- with P0001 'No autorizado para modificar campos protegidos del perfil'.
-- The guard exists to stop CLIENT SELF-SERVICE edits of protected fields;
-- a request without a user identity (service role, SQL editor) is not one,
-- so it is now exempt. RLS still restricts which rows real users can touch.
--
-- Known live drift NOT touched here (works, but differs from the files):
--   * role/status/training_type are text instead of the enums
--   * full_name and email are NOT NULL (nullable in the files)
--   * training_type is nullable with no default ('in_person' in the files)

alter table public.profiles alter column role set default 'client';

grant all on public.profiles to service_role;

create or replace function public.guard_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- No user JWT (service role / SQL editor) → trusted server context.
  if auth.uid() is not null and not public.is_coach() then
    if new.role     is distinct from old.role
       or new.coach_id is distinct from old.coach_id
       or new.status   is distinct from old.status then
      raise exception 'No autorizado para modificar campos protegidos del perfil';
    end if;
  end if;
  return new;
end;
$$;
