-- auth foundation: profiles + roles + RLS.
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Idempotent where practical so it's safe to re-run during setup.

-- 1. Role enum -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('coach', 'client');
  end if;
end $$;

-- 2. Profiles table (1:1 with auth.users) ----------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- 3. Auto-create a profile row whenever a user signs up --------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security ----------------------------------------------------
alter table public.profiles enable row level security;

-- Helper: is the current user a coach? (security definer avoids RLS recursion)
create or replace function public.is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coach'
  );
$$;

-- Users can read their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Coaches can read client profiles.
drop policy if exists "coach reads clients" on public.profiles;
create policy "coach reads clients"
  on public.profiles for select
  using (public.is_coach() and role = 'client');

-- Users can update their own profile (but not their role — enforced below).
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent self role-escalation: a non-coach cannot change their own role.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_coach() then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_role on public.profiles;
create trigger protect_role
  before update on public.profiles
  for each row execute function public.guard_role_change();
