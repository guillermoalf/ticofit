-- 0010: invite-only enforcement. No ledger row, no account. Full stop.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0008 (is_admin) and 0009 (preauthorized_emails).
--
-- THE RULE
--   An insert into auth.users succeeds ONLY when a pending authorization
--   exists for that address. Otherwise handle_new_user() raises and the
--   whole signup transaction is rolled back — no auth user, no profile, no
--   orphan to clean up. Google, email/password, magic link: all of them go
--   through this trigger, so all of them are denied.
--
-- HOW A LEGITIMATE ACCOUNT IS BORN
--   The admin (for a coach) or a coach (for a client) writes the ledger row
--   server-side and immediately calls the Admin API to create the account
--   with email_confirm = true and NO password. This trigger consumes the row
--   and builds the profile with the role and coach_id the ledger dictates.
--   The invitee never signs up: their account already exists when they first
--   arrive, so their profile id is fixed from day one and everything the
--   coach recorded (measurements, fees, routines) stays attached to it.
--
-- HOW THEY GET IN
--   Google: Supabase Auth links an OAuth identity to the existing user when
--   the address matches and is confirmed, so no new auth.users row is
--   created and this trigger never fires. They land on their own profile,
--   data intact. (Verified against the Identity Linking docs; the same page
--   explains why confirmed emails are required — unverified ones would allow
--   pre-account-takeover.)
--   Password: set from inside the app afterwards (updateUser), which is why
--   accounts are created WITHOUT one — has_password() below drives that
--   prompt.

-- 1. Access columns --------------------------------------------------------
-- `authorized` is the revocation switch: an admin can suspend a coach
-- without deleting them and every policy that calls is_coach() goes cold.
-- Added as `default true` so any pre-existing install grandfathers its
-- users in, then the default flips to false.
alter table public.profiles
  add column if not exists authorized boolean not null default true;
alter table public.profiles
  alter column authorized set default false;

alter table public.profiles
  add column if not exists password_prompt_dismissed boolean not null default false;

comment on column public.profiles.authorized is
  'Access switch. Set true by handle_new_user() when the ledger authorized the account; flip to false to suspend without deleting.';

-- 2. is_coach(): a suspended coach stops being a coach ---------------------
-- Same signature and semantics as 0001, plus the access flag, so every
-- existing policy that calls it keeps working unchanged.
create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'coach'
      and authorized
  );
$$;

-- 3. Does the current user have a password yet? ----------------------------
-- Authoritative (reads auth.users, which the app cannot), and drives the
-- "crear contraseña" prompt after a first Google login.
create or replace function public.has_password()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and encrypted_password is not null
      and encrypted_password <> ''
  );
$$;

revoke execute on function public.has_password() from public, anon;
grant execute on function public.has_password() to authenticated, service_role;

-- 4. The gate --------------------------------------------------------------
-- Replaces the 0002 version. It keeps that file's rule — role is NEVER read
-- from raw_user_meta_data, because a signup must not be able to name its own
-- role — and adds the denial.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text := lower(trim(coalesce(new.email, '')));
  v_preauth public.preauthorized_emails%rowtype;
begin
  if v_email <> '' then
    select * into v_preauth
    from public.preauthorized_emails
    where email = v_email
      and consumed_at is null
    order by created_at
    limit 1
    for update;
  end if;

  if v_preauth.id is null then
    -- INVITE ONLY. Rolls back the auth.users insert: the account is never
    -- created. Surfaces to the browser as an auth error, which the app maps
    -- to /sin-acceso ("Esta plataforma es solo por invitación").
    raise exception 'ACCESO_NO_AUTORIZADO: % no está pre-autorizado', v_email
      using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name, email, role, coach_id, authorized, has_account)
  values (
    new.id,
    coalesce(
      nullif(trim(v_preauth.full_name), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(v_email, '@', 1), '')
    ),
    nullif(v_email, ''),
    v_preauth.intended_role,
    v_preauth.coach_id,
    true,
    true
  )
  on conflict (id) do nothing;

  update public.preauthorized_emails
  set consumed_at = now(),
      consumed_by = new.id
  where id = v_preauth.id;

  return new;
end;
$$;

-- Recreated so this file is self-sufficient on a fresh database.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Escalation guard ------------------------------------------------------
-- Replaces the 0006 version. Additions: role changes are admin-only, 'admin'
-- can never be assigned from a user session at all, and `authorized` joins
-- the protected set.
create or replace function public.guard_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted context: no user JWT (service role / SQL editor).
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Admins are minted by SQL only (0012), never through the app.
  if new.role is distinct from old.role and new.role = 'admin' then
    raise exception 'No autorizado para asignar el rol de administrador';
  end if;

  -- A coach must never promote anyone, including themselves: coaches
  -- authorize clients and nothing else.
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'No autorizado para cambiar el rol';
  end if;

  -- Coaches still manage their own clients' ownership/status (RLS already
  -- scopes them to those rows); everyone else may not touch these fields.
  if not public.is_coach() and not public.is_admin() then
    if new.coach_id      is distinct from old.coach_id
       or new.status     is distinct from old.status
       or new.authorized is distinct from old.authorized then
      raise exception 'No autorizado para modificar campos protegidos del perfil';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.guard_protected_fields();
