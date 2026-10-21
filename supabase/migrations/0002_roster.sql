-- Fase 0: client roster.
-- Extends `profiles` with roster fields and scopes coach access to their own
-- clients (coach_id = the coach). Run in the Supabase SQL editor (or
-- `supabase db push`). Idempotent so it's safe to re-run during setup.
-- Depends on 0001_profiles.sql (profiles table, user_role enum, is_coach()).

-- 1. New enums -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_status') then
    create type client_status as enum ('active', 'paused');
  end if;
  if not exists (select 1 from pg_type where typname = 'training_type') then
    create type training_type as enum ('in_person', 'remote', 'hybrid');
  end if;
end $$;

-- 2. Roster columns on profiles -------------------------------------------
-- email is duplicated from auth.users so the coach roster can list/search
-- clients without the admin API. coach_id is which coach owns this client.
alter table public.profiles
  add column if not exists email           text,
  add column if not exists phone           text,
  add column if not exists status          client_status not null default 'active',
  add column if not exists training_type   training_type not null default 'in_person',
  add column if not exists equipment_notes text,
  add column if not exists goal            text,
  add column if not exists coach_id        uuid references public.profiles (id) on delete set null;

create index if not exists profiles_coach_id_idx on public.profiles (coach_id);

-- 3. Keep email in sync on signup -----------------------------------------
-- Replaces the 0001 version so new auth users also get their email mirrored.
-- NOTE: role is intentionally NOT read from metadata — a public self-signup
-- must never be able to make itself a coach. Coaches are promoted manually
-- (see bottom). Coach-created clients get coach_id/details set server-side
-- by the admin action (service role), so we don't trust client metadata here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. RLS: scope coach access to their own clients -------------------------
-- (RLS is already enabled on profiles from 0001.)

-- Replace the broad "any coach sees all clients" policy from 0001 with one
-- scoped to the owning coach. Reading only this row's coach_id column does
-- not recurse into profiles, so no recursion guard is needed here.
drop policy if exists "coach reads clients" on public.profiles;
drop policy if exists "coach reads own clients" on public.profiles;
create policy "coach reads own clients"
  on public.profiles for select
  using (public.is_coach() and coach_id = auth.uid());

-- A coach may insert client rows they own. (Real creation happens server-side
-- via the admin API so the auth.users row exists first; this policy documents
-- and enforces the intended ownership boundary.)
drop policy if exists "coach inserts clients" on public.profiles;
create policy "coach inserts clients"
  on public.profiles for insert
  with check (public.is_coach() and coach_id = auth.uid() and role = 'client');

-- A coach may update profiles they own (their clients).
drop policy if exists "coach updates own clients" on public.profiles;
create policy "coach updates own clients"
  on public.profiles for update
  using (public.is_coach() and coach_id = auth.uid())
  with check (public.is_coach() and coach_id = auth.uid());

-- "read own profile" and "update own profile" from 0001 stay as-is: every
-- user reads/edits their own row, and a client (not a coach) matches no other
-- policy, so a client can never see another client.

-- 5. Protect sensitive fields from self-service edits ---------------------
-- Clients edit their own row via "update own profile", but must not change
-- role, coach_id, or status (those are coach/admin-managed). Replaces the
-- 0001 role-only guard.
create or replace function public.guard_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_coach() then
    if new.role     is distinct from old.role
       or new.coach_id is distinct from old.coach_id
       or new.status   is distinct from old.status then
      raise exception 'No autorizado para modificar campos protegidos del perfil';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_role on public.profiles;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.guard_protected_fields();

-- (Optional) the old guard function from 0001 is now unused; drop if present.
drop function if exists public.guard_role_change();

-- ── One-time: promote the founder account to coach ───────────────────────
-- Sign up once through the portal with the coach's email, then run:
--   update public.profiles set role = 'coach' where email = 'coach@example.com';
