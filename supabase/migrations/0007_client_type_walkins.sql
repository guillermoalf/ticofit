-- 0007: client classification + optional auth account (walk-ins).
-- Run in the Supabase SQL editor. Idempotent.
--
-- Linkage decision: profiles stays the single client table; the FK
-- profiles.id → auth.users(id) is dropped and id gets a gen_random_uuid()
-- default. A walk-in is a profile row whose id matches no auth user, so no
-- JWT can ever carry it — every existing RLS policy keeps working unchanged
-- (coach access via coach_id, self access via auth.uid() = id). The
-- handle_new_user trigger still inserts account profiles with the auth id.

-- 1. Classification. Live drift note: role/status are text (not enums) in the
-- deployed DB, so client_type follows the same pattern: text + CHECK.
alter table public.profiles
  add column if not exists client_type text not null default 'entrenamiento';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_client_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_client_type_check
      check (client_type in ('entrenamiento','fisioterapia','coaching','otro'));
  end if;
end $$;

-- 2. Decouple profiles from auth.users: drop the id FK (looked up dynamically
-- in case the live constraint name drifted) and default id to a random uuid.
do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'f'
    and confrelid = 'auth.users'::regclass;
  if fk_name is not null then
    execute format('alter table public.profiles drop constraint %I', fk_name);
  end if;
end $$;

alter table public.profiles alter column id set default gen_random_uuid();

-- 3. Walk-ins have no email; relax the live NOT NULL (files already had it
-- nullable — this is drift alignment, existing rows keep their emails).
alter table public.profiles alter column email drop not null;

-- 4. Flag so the app can distinguish account clients from walk-ins without
-- the admin API. Backfill: every existing profile today has an auth account.
alter table public.profiles
  add column if not exists has_account boolean not null default true;

-- 5. Replace the lost ON DELETE CASCADE: removing an auth user removes the
-- matching profile (and, via existing FKs, its routines/visits/etc.).
create or replace function public.handle_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_deleted_user();

-- RLS: intentionally untouched. Walk-in rows are only reachable via the
-- coach policies (coach_id = auth.uid()); no JWT can ever carry a walk-in id.
