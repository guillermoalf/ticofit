-- 0026: the due date is a payment day, not a late day.
-- Run in the Supabase SQL editor after supabase/dry-runs/0026_dry_run.sql passes.
-- Idempotent. Depends on 0025. Replaces the view only: same columns, same order.
--
-- 0025 counted the due date itself as the first day late and suspended one day
-- before the grace period ended. Now, with paid_through = the last day paid:
--   due_date     = paid_through + 1            (paying that day is on time)
--   active       today <= due_date
--   overdue      up to grace days after the due date, or while reactivated
--   suspended    after that
--   days_overdue = days since the due date (0 on the due date)

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
  greatest(0, public.today_cr() - (x.paid_through + 1)) as days_overdue,
  case
    when m.id is null then 'none'
    when public.today_cr() <= x.paid_through + 1 then 'active'
    when public.today_cr() <= x.paid_through + 1 + public.setting_int('payments.grace_days', 5)
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

-- CREATE OR REPLACE keeps the grants; restate them so the file stands on its own.
revoke all on public.membership_overview from public, anon, authenticated;
grant select on public.membership_overview to authenticated;
grant all on public.membership_overview to service_role;
