-- 0009: preauthorized_emails — the access ledger.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0008_admin_role.sql (is_admin) and 0001/0002 (profiles,
-- is_coach, coach_id ownership).
--
-- One row = "an account for this address may be created, as this role, under
-- this coach". It is the ONLY thing that authorizes an insert into
-- auth.users: 0010's trigger consumes a matching row or raises, so a signup
-- with no row here is rolled back and no account ever exists.
--
-- Rows are written server-side immediately before the Admin API creates the
-- account (admin → coach, coach → client), never by the person signing in.
--
-- WHO MAY WRITE WHAT (RLS below + the guard trigger + the app's own checks):
--   admin  → 'coach' rows only. Reads every row.
--   coach  → 'client' rows only, always coach_id = themselves. Reads only
--            their own. The WITH CHECK pins intended_role, so a coach
--            authorizing a coach is refused by the database itself.
--   client → no policy at all → RLS denies the table entirely.
--   'admin' rows → only from a trusted context with no user JWT (the SQL
--            editor / service role). See the guard trigger in section 5.

-- 1. Table -----------------------------------------------------------------
create table if not exists public.preauthorized_emails (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  intended_role public.user_role not null,
  -- Lets the admin/coach name the person up front so the roster and the
  -- portal show a real name from the very first second.
  full_name     text,
  -- Who authorized this address (admin for coaches, coach for clients).
  authorized_by uuid references public.profiles (id) on delete set null,
  -- Which coach the invitee belongs to. NULL for coaches and the admin.
  coach_id      uuid references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  consumed_at   timestamptz,
  consumed_by   uuid references public.profiles (id) on delete set null
);

-- 2. Constraints -----------------------------------------------------------
do $$
begin
  -- A client always belongs to a coach; a coach or admin never does.
  if not exists (select 1 from pg_constraint where conname = 'preauthorized_emails_shape_check') then
    alter table public.preauthorized_emails
      add constraint preauthorized_emails_shape_check
      check (
        (intended_role = 'client' and coach_id is not null)
        or
        (intended_role in ('coach','admin') and coach_id is null)
      );
  end if;

  -- Emails are stored normalized (trigger below), so lookups are a plain
  -- equality match against the unique index.
  if not exists (select 1 from pg_constraint where conname = 'preauthorized_emails_email_check') then
    alter table public.preauthorized_emails
      add constraint preauthorized_emails_email_check
      check (email = lower(email) and position('@' in email) > 1);
  end if;
end $$;

-- 3. Indexes ---------------------------------------------------------------
-- At most ONE pending authorization per address: two coaches cannot both
-- claim the same person, and an address cannot be pending twice. Consumed
-- rows are excluded, so re-authorizing after an account is deleted works.
create unique index if not exists preauthorized_emails_pending_email_key
  on public.preauthorized_emails (email)
  where consumed_at is null;

create index if not exists preauthorized_emails_email_idx
  on public.preauthorized_emails (email);

create index if not exists preauthorized_emails_coach_id_idx
  on public.preauthorized_emails (coach_id);

-- 4. Normalization ---------------------------------------------------------
create or replace function public.normalize_preauthorized_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.full_name := nullif(trim(coalesce(new.full_name, '')), '');
  return new;
end;
$$;

drop trigger if exists normalize_preauthorized_email on public.preauthorized_emails;
create trigger normalize_preauthorized_email
  before insert or update on public.preauthorized_emails
  for each row execute function public.normalize_preauthorized_email();

-- 5. The admin guard -------------------------------------------------------
-- 'admin' is allowed in this table ONLY so the platform owner can bootstrap
-- themselves from the SQL editor (0012) through the same machinery as
-- everyone else. No session holding a user JWT may ever write one — not even
-- an existing admin — so the owner role can never be minted from the app.
create or replace function public.guard_admin_authorization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.intended_role = 'admin' and (select auth.uid()) is not null then
    raise exception 'No autorizado para pre-autorizar un administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_admin_authorization on public.preauthorized_emails;
create trigger guard_admin_authorization
  before insert or update on public.preauthorized_emails
  for each row execute function public.guard_admin_authorization();

-- 6. Row Level Security ----------------------------------------------------
alter table public.preauthorized_emails enable row level security;

-- 6a. Admin ----------------------------------------------------------------
drop policy if exists "admin reads authorizations" on public.preauthorized_emails;
create policy "admin reads authorizations"
  on public.preauthorized_emails for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin authorizes coaches" on public.preauthorized_emails;
create policy "admin authorizes coaches"
  on public.preauthorized_emails for insert
  to authenticated
  with check (
    public.is_admin()
    and intended_role = 'coach'      -- never 'admin', never 'client'
    and coach_id is null
    and authorized_by = (select auth.uid())
  );

drop policy if exists "admin revokes pending coach authorizations" on public.preauthorized_emails;
create policy "admin revokes pending coach authorizations"
  on public.preauthorized_emails for delete
  to authenticated
  using (
    public.is_admin()
    and intended_role = 'coach'
    and consumed_at is null
  );

-- 6b. Coach ----------------------------------------------------------------
drop policy if exists "coach reads own client authorizations" on public.preauthorized_emails;
create policy "coach reads own client authorizations"
  on public.preauthorized_emails for select
  to authenticated
  using (
    public.is_coach()
    and intended_role = 'client'
    and coach_id = (select auth.uid())
  );

drop policy if exists "coach authorizes own clients" on public.preauthorized_emails;
create policy "coach authorizes own clients"
  on public.preauthorized_emails for insert
  to authenticated
  with check (
    public.is_coach()
    and intended_role = 'client'     -- a coach can only ever create clients
    and coach_id = (select auth.uid())
    and authorized_by = (select auth.uid())
  );

drop policy if exists "coach revokes own pending client authorizations" on public.preauthorized_emails;
create policy "coach revokes own pending client authorizations"
  on public.preauthorized_emails for delete
  to authenticated
  using (
    public.is_coach()
    and intended_role = 'client'
    and coach_id = (select auth.uid())
    and consumed_at is null
  );

-- No UPDATE policy for anyone: a row is created, then consumed by the
-- SECURITY DEFINER trigger in 0010. Nothing else may rewrite history.
-- No policy for clients or anon → RLS denies them the table entirely.

-- 7. Grants ----------------------------------------------------------------
-- SQL-created tables get no automatic grants (see 0005). RLS still applies.
grant select, insert, delete on public.preauthorized_emails to authenticated;
grant all on public.preauthorized_emails to service_role;
