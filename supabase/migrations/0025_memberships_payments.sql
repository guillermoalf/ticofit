-- 0025: plans, memberships, payments and SINPE receipts (phase 3).
-- Run in the Supabase SQL editor after supabase/dry-runs/0025_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023 and 0024.
--
-- BILLING (PROGRESS.md A7)
--   A membership stores raw facts only: plan, start_date and how many periods
--   have been paid. Everything else is computed on read (membership_overview):
--     paid_through = start_date + periods_paid months - 1 day
--   counted from the anchor every time, so a 31st never drifts to the 28th.
--   Each client keeps the billing day of their own start date (by default the
--   join date). status:
--     active    today <= paid_through
--     overdue   past due, within the grace days (setting) or reactivated
--     suspended past due and past grace: routine locked, no reservations
--   A payment never shortens a reactivation: it simply runs out.
--   Payments only ever move forward through two functions: approving a receipt
--   or recording cash. Nothing in the app can edit or delete a payment.

-- 1. Plans ---------------------------------------------------------------------------
create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  sede_id    text not null references public.sedes (id),
  -- membership = monthly fee that keeps the client active.
  -- package    = sold by the unit (personal training, recovery, single classes);
  --              listed for reference, not billed by this system yet.
  kind       text not null check (kind in ('membership', 'package')),
  name       text not null check (char_length(btrim(name)) between 2 and 80),
  price_crc  integer not null check (price_crc between 0 and 10000000),
  units      smallint check (units between 1 and 100),
  unit_label text check (char_length(unit_label) <= 40),
  active     boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null,
  constraint plans_sede_name_key unique (sede_id, name)
);
comment on table public.plans is
  'Prices before IVA. Seeded from the public /membresias page (src/content/landing.ts), editable in Ajustes.';

insert into public.plans (sede_id, kind, name, price_crc, units, unit_label, sort_order) values
  ('bellavista', 'membership', 'Open gym',                       40000, null, null,       1),
  ('bellavista', 'package',    'Entrenamiento personal · 4',     17500, 4,    'sesiones', 2),
  ('bellavista', 'package',    'Entrenamiento personal · 8',     15000, 8,    'sesiones', 3),
  ('bellavista', 'package',    'Entrenamiento personal · 12',    12500, 12,   'sesiones', 4),
  ('cafe',       'membership', 'Premium',                        60000, null, null,       1),
  ('cafe',       'membership', 'Plus Premium',                   80000, null, null,       2),
  ('cafe',       'membership', 'Plus +',                        100000, null, null,       3),
  ('cafe',       'package',    'Recovery · 1',                   25000, 1,    'sesiones', 4),
  ('cafe',       'package',    'Recovery · 2',                   22500, 2,    'sesiones', 5),
  ('cafe',       'package',    'Recovery · 3',                   20000, 3,    'sesiones', 6),
  ('cafe',       'package',    'Recovery · 4',                   17500, 4,    'sesiones', 7),
  ('cafe',       'package',    'Clases sueltas · 4',             20000, 4,    'clases',   8),
  ('cafe',       'package',    'Clases sueltas · 8',             18000, 8,    'clases',   9),
  ('cafe',       'package',    'Clases sueltas · 12 o más',      16000, 12,   'clases',  10)
on conflict (sede_id, name) do nothing;

-- 2. Membership: one per client --------------------------------------------------------
create table if not exists public.client_memberships (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null unique references public.clients (id) on delete cascade,
  plan_id           uuid not null references public.plans (id),
  start_date        date not null,
  periods_paid      integer not null default 0 check (periods_paid between 0 and 1200),
  reactivated_until date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by_staff  uuid references public.staff (id) on delete set null,
  updated_by_staff  uuid references public.staff (id) on delete set null
);
create index if not exists client_memberships_plan_idx on public.client_memberships (plan_id);

create table if not exists public.membership_events (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  kind       text not null check (kind in ('assigned', 'plan_changed', 'restarted', 'reactivated')),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null
);
create index if not exists membership_events_client_idx on public.membership_events (client_id, created_at desc);

-- 3. Receipts (uploaded by the client) and payments ----------------------------------------
create table if not exists public.payment_receipts (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  -- <client_id>/<file> inside the private "receipts" bucket.
  file_path         text not null unique,
  amount_crc        integer not null check (amount_crc between 1 and 10000000),
  paid_on           date not null,
  reference         text check (char_length(reference) <= 60),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason     text check (char_length(reject_reason) <= 300),
  reviewed_by_staff uuid references public.staff (id) on delete set null,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint payment_receipts_path_check check (split_part(file_path, '/', 1) = client_id::text),
  constraint payment_receipts_rejection_check check (status <> 'rejected' or reject_reason is not null)
);
create index if not exists payment_receipts_client_idx on public.payment_receipts (client_id, created_at desc);
create index if not exists payment_receipts_pending_idx on public.payment_receipts (created_at) where status = 'pending';

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients (id) on delete cascade,
  plan_id            uuid references public.plans (id),
  amount_crc         integer not null check (amount_crc between 1 and 10000000),
  paid_on            date not null,
  periods            smallint not null default 1 check (periods between 1 and 12),
  method             text not null check (method in ('receipt', 'cash')),
  receipt_id         uuid unique references public.payment_receipts (id),
  recorded_by_staff  uuid references public.staff (id) on delete set null,
  created_at         timestamptz not null default now(),
  constraint payments_receipt_check check ((method = 'receipt') = (receipt_id is not null))
);
create index if not exists payments_client_idx on public.payments (client_id, paid_on desc);

insert into public.app_settings (key, value, label)
values ('payments.grace_days', '5', 'Días de gracia después del vencimiento antes de suspender')
on conflict (key) do nothing;

alter table public.app_settings drop constraint if exists app_settings_payment_rules_check;
alter table public.app_settings add constraint app_settings_payment_rules_check check (
  case
    when key <> 'payments.grace_days' then true
    when jsonb_typeof(value) <> 'number' then false
    when (value #>> '{}') !~ '^[0-9]{1,2}$' then false
    else (value #>> '{}')::integer between 0 and 60
  end
);

-- 4. Status, computed on read ----------------------------------------------------------------
create or replace function public.today_cr()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/Costa_Rica')::date;
$$;

-- security_invoker: whoever reads it only sees the rows RLS gives them.
create or replace view public.membership_overview with (security_invoker = true) as
select
  c.id                                   as client_id,
  c.sede_id,
  c.full_name,
  c.phone,
  m.id is not null                       as has_membership,
  m.plan_id,
  p.name                                 as plan_name,
  p.price_crc,
  m.start_date,
  m.periods_paid,
  m.reactivated_until,
  x.paid_through,
  x.paid_through + 1                     as due_date,
  greatest(0, public.today_cr() - x.paid_through) as days_overdue,
  case
    when m.id is null then 'none'
    when public.today_cr() <= x.paid_through then 'active'
    when public.today_cr() <= x.paid_through + public.setting_int('payments.grace_days', 5)
      or m.reactivated_until >= public.today_cr() then 'overdue'
    else 'suspended'
  end                                    as status,
  (select max(pay.paid_on) from public.payments pay where pay.client_id = c.id) as last_paid_on
from public.clients c
left join public.client_memberships m on m.client_id = c.id
left join public.plans p on p.id = m.plan_id
cross join lateral (
  select (m.start_date + make_interval(months => m.periods_paid))::date - 1 as paid_through
) x;

-- 5. Writes, all through checked functions ----------------------------------------------------
create or replace function public.membership_assign(p_client_id uuid, p_plan_id uuid, p_restart_on date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_old    public.client_memberships%rowtype;
begin
  if not public.staff_can_client('memberships.write', p_client_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  select * into v_client from public.clients where id = p_client_id;
  if not exists (select 1 from public.plans where id = p_plan_id and kind = 'membership'
                 and active and sede_id = v_client.sede_id) then
    raise exception 'PLAN_NOT_AVAILABLE' using errcode = '22023';
  end if;
  if p_restart_on is not null and abs(p_restart_on - public.today_cr()) > 366 then
    raise exception 'DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;

  select * into v_old from public.client_memberships where client_id = p_client_id for update;
  if v_old.id is null then
    insert into public.client_memberships (client_id, plan_id, start_date, created_by_staff, updated_by_staff)
    values (p_client_id, p_plan_id, coalesce(p_restart_on, v_client.join_date),
            public.current_staff_id(), public.current_staff_id());
    insert into public.membership_events (client_id, kind, created_by_staff)
    values (p_client_id, 'assigned', public.current_staff_id());
  elsif p_restart_on is not null then
    update public.client_memberships
    set plan_id = p_plan_id, start_date = p_restart_on, periods_paid = 0, reactivated_until = null,
        updated_at = now(), updated_by_staff = public.current_staff_id()
    where id = v_old.id;
    insert into public.membership_events (client_id, kind, note, created_by_staff)
    values (p_client_id, 'restarted', 'Desde ' || to_char(p_restart_on, 'DD/MM/YYYY'), public.current_staff_id());
  elsif v_old.plan_id <> p_plan_id then
    update public.client_memberships
    set plan_id = p_plan_id, updated_at = now(), updated_by_staff = public.current_staff_id()
    where id = v_old.id;
    insert into public.membership_events (client_id, kind, created_by_staff)
    values (p_client_id, 'plan_changed', public.current_staff_id());
  end if;
end;
$$;

-- Lifts a suspension for the grace days, so the client can come in while they pay.
create or replace function public.membership_reactivate(p_client_id uuid, p_note text)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_until date := public.today_cr() + public.setting_int('payments.grace_days', 5);
begin
  if not public.staff_can_client('memberships.write', p_client_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  update public.client_memberships
  set reactivated_until = v_until, updated_at = now(), updated_by_staff = public.current_staff_id()
  where client_id = p_client_id;
  if not found then
    raise exception 'NO_MEMBERSHIP' using errcode = '22023';
  end if;
  insert into public.membership_events (client_id, kind, note, created_by_staff)
  values (p_client_id, 'reactivated', nullif(left(btrim(p_note), 500), ''), public.current_staff_id());
  return v_until;
end;
$$;

create or replace function public.payment_record_cash(p_client_id uuid, p_amount integer, p_paid_on date, p_periods smallint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.client_memberships%rowtype;
  v_id     uuid;
begin
  if not public.staff_can_client('payments.cash', p_client_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if p_paid_on is null or p_paid_on > public.today_cr() or p_paid_on < public.today_cr() - 366 then
    raise exception 'DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;
  select * into v_member from public.client_memberships where client_id = p_client_id for update;
  if v_member.id is null then
    raise exception 'NO_MEMBERSHIP' using errcode = '22023';
  end if;
  insert into public.payments (client_id, plan_id, amount_crc, paid_on, periods, method, recorded_by_staff)
  values (p_client_id, v_member.plan_id, p_amount, p_paid_on, p_periods, 'cash', public.current_staff_id())
  returning id into v_id;
  update public.client_memberships
  set periods_paid = periods_paid + p_periods,
      updated_at = now(), updated_by_staff = public.current_staff_id()
  where id = v_member.id;
  return v_id;
end;
$$;

-- Approving extends the membership one period; rejecting needs a reason the client sees.
create or replace function public.receipt_review(p_receipt_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.payment_receipts%rowtype;
  v_member  public.client_memberships%rowtype;
begin
  select * into v_receipt from public.payment_receipts where id = p_receipt_id for update;
  if v_receipt.id is null or not public.staff_can_client('payments.review', v_receipt.client_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if v_receipt.status <> 'pending' then
    raise exception 'ALREADY_REVIEWED' using errcode = '22023';
  end if;

  if coalesce(p_approve, false) then
    select * into v_member from public.client_memberships where client_id = v_receipt.client_id for update;
    if v_member.id is null then
      raise exception 'NO_MEMBERSHIP' using errcode = '22023';
    end if;
    update public.payment_receipts
    set status = 'approved', reviewed_by_staff = public.current_staff_id(), reviewed_at = now()
    where id = v_receipt.id;
    insert into public.payments (client_id, plan_id, amount_crc, paid_on, periods, method, receipt_id, recorded_by_staff)
    values (v_receipt.client_id, v_member.plan_id, v_receipt.amount_crc, v_receipt.paid_on, 1, 'receipt',
            v_receipt.id, public.current_staff_id());
    update public.client_memberships
    set periods_paid = periods_paid + 1,
        updated_at = now(), updated_by_staff = public.current_staff_id()
    where id = v_member.id;
  else
    if nullif(btrim(p_reason), '') is null then
      raise exception 'REASON_REQUIRED' using errcode = '22023';
    end if;
    update public.payment_receipts
    set status = 'rejected', reject_reason = left(btrim(p_reason), 300),
        reviewed_by_staff = public.current_staff_id(), reviewed_at = now()
    where id = v_receipt.id;
  end if;
end;
$$;

-- A receipt row must point at a file the client really uploaded to their folder.
create or replace function public.guard_receipt_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from storage.objects o where o.bucket_id = 'receipts' and o.name = new.file_path) then
    raise exception 'RECEIPT_FILE_MISSING' using errcode = '22023';
  end if;
  if new.paid_on > public.today_cr() or new.paid_on < public.today_cr() - 120 then
    raise exception 'DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists guard_receipt_insert on public.payment_receipts;
create trigger guard_receipt_insert before insert on public.payment_receipts
  for each row execute function public.guard_receipt_insert();

drop trigger if exists stamp_staff_audit on public.plans;
create trigger stamp_staff_audit before insert or update on public.plans
  for each row execute function public.stamp_staff_audit();

-- 6. Storage: private bucket, one folder per client ----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "client uploads own receipt file" on storage.objects;
create policy "client uploads own receipt file" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.own_client_id())::text);
drop policy if exists "client reads own receipt file" on storage.objects;
create policy "client reads own receipt file" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select public.own_client_id())::text);
-- Staff read receipt files only through signed URLs made on the server after RLS
-- has shown them the receipt row.

-- 7. RLS ---------------------------------------------------------------------------------------
alter table public.plans              enable row level security;
alter table public.client_memberships enable row level security;
alter table public.membership_events  enable row level security;
alter table public.payment_receipts   enable row level security;
alter table public.payments           enable row level security;

drop policy if exists "signed in reads plans" on public.plans;
create policy "signed in reads plans" on public.plans for select to authenticated using (true);
drop policy if exists "settings staff edits plans" on public.plans;
create policy "settings staff edits plans" on public.plans for update to authenticated
  using ((select public.staff_can('settings.manage')) and sede_id in (select public.staff_sede_ids()))
  with check ((select public.staff_can('settings.manage')) and sede_id in (select public.staff_sede_ids()));

drop policy if exists "staff or self reads membership" on public.client_memberships;
create policy "staff or self reads membership" on public.client_memberships for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('clients.read', client_id));

drop policy if exists "staff reads membership events" on public.membership_events;
create policy "staff reads membership events" on public.membership_events for select to authenticated
  using (public.staff_can_client('clients.read', client_id));

drop policy if exists "staff or self reads receipts" on public.payment_receipts;
create policy "staff or self reads receipts" on public.payment_receipts for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('payments.review', client_id));
drop policy if exists "client submits own receipt" on public.payment_receipts;
create policy "client submits own receipt" on public.payment_receipts for insert to authenticated
  with check (client_id = (select public.own_client_id()));

drop policy if exists "staff or self reads payments" on public.payments;
create policy "staff or self reads payments" on public.payments for select to authenticated
  using (client_id = (select public.own_client_id()) or public.staff_can_client('clients.read', client_id));

-- 8. Grants: from zero (default privileges give ALL, see 0023) -----------------------------------
revoke all on public.plans, public.client_memberships, public.membership_events,
  public.payment_receipts, public.payments, public.membership_overview
  from public, anon, authenticated;

grant select on public.plans, public.client_memberships, public.membership_events,
  public.payment_receipts, public.payments, public.membership_overview to authenticated;
grant update (name, price_crc, active) on public.plans to authenticated;
grant insert (client_id, file_path, amount_crc, paid_on, reference) on public.payment_receipts to authenticated;
grant all on public.plans, public.client_memberships, public.membership_events,
  public.payment_receipts, public.payments, public.membership_overview to service_role;

revoke execute on function
  public.membership_assign(uuid, uuid, date), public.membership_reactivate(uuid, text),
  public.payment_record_cash(uuid, integer, date, smallint), public.receipt_review(uuid, boolean, text),
  public.today_cr()
  from public, anon;
grant execute on function
  public.membership_assign(uuid, uuid, date), public.membership_reactivate(uuid, text),
  public.payment_record_cash(uuid, integer, date, smallint), public.receipt_review(uuid, boolean, text),
  public.today_cr()
  to authenticated, service_role;
revoke execute on function public.guard_receipt_insert() from public, anon, authenticated;
