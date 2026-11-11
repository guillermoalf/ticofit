-- 0022: waitlist for a sede that hasn't opened yet (ticofit parque del café).
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0001 (is_coach) and 0008 (is_admin).
--
-- WHO DOES WHAT
--   anon / public site → INSERT only, through a server action on the landing
--                        page. It can never read the list back.
--   admin, coach       → read the list, mark rows as notified, delete.
--
-- One sign-up per address per sede: unique (sede, email). The server action
-- treats a duplicate (23505) as success, so the visitor never learns whether
-- an address is already on the list.

create table if not exists public.waitlist (
  id              uuid primary key default gen_random_uuid(),
  sede            text not null check (sede in ('bellavista', 'cafe')),
  nombre_completo text not null check (char_length(btrim(nombre_completo)) between 2 and 120),
  -- Normalised by the app to 8 digits (no +506).
  telefono        text not null check (telefono ~ '^[245678][0-9]{7}$'),
  email           text not null check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and char_length(email) <= 254),
  created_at      timestamptz not null default now(),
  notificado      boolean not null default false,
  constraint waitlist_sede_email_key unique (sede, email)
);

comment on table public.waitlist is
  'Sign-ups for a sede that has not opened yet. Inserted by the public site (anon); read and managed by admin/coach.';

-- The admin view lists newest first, optionally filtered by sede.
create index if not exists waitlist_sede_created_at_idx
  on public.waitlist (sede, created_at desc);
create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

drop policy if exists "public joins waitlist" on public.waitlist;
create policy "public joins waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (notificado = false);

drop policy if exists "staff reads waitlist" on public.waitlist;
create policy "staff reads waitlist"
  on public.waitlist for select
  to authenticated
  using ((select public.is_admin()) or (select public.is_coach()));

drop policy if exists "staff updates waitlist" on public.waitlist;
create policy "staff updates waitlist"
  on public.waitlist for update
  to authenticated
  using ((select public.is_admin()) or (select public.is_coach()))
  with check ((select public.is_admin()) or (select public.is_coach()));

drop policy if exists "staff deletes waitlist" on public.waitlist;
create policy "staff deletes waitlist"
  on public.waitlist for delete
  to authenticated
  using ((select public.is_admin()) or (select public.is_coach()));

-- Raw SQL tables get no automatic grants (see 0005).
grant insert on public.waitlist to anon;
grant select, insert, update, delete on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
