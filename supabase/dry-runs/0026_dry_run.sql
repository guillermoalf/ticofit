-- PRUEBA de la migración 0026 (8 casos). NO es una migración y NO guarda nada.
-- Migración probada: sha256 160077d5199e5354295d49524423cd00892bd501a253043050155a7923e1795a
--
-- Pegá TODO en el SQL Editor de Supabase (proyecto branjuyfmqqrbisclasy) y dale Run.
-- Siempre termina en "error", a propósito, para deshacer todo:
--   DRYRUN_OK ...     = pasó todo
--   DRYRUN_FALLAS ... = corrió y encontró problemas
--   cualquier otro    = se cayó antes de terminar (igual no guarda nada)
-- Copiá solo la primera línea del mensaje.

do $dry$
declare resultado text;
begin
  begin
execute $mig$
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

$mig$;
execute $tests$

create function public.dryrun_value(p_sql text) returns text language plpgsql as $v$
declare r text; begin execute p_sql into r; return r; end $v$;
grant execute on function public.dryrun_value(text) to anon, authenticated;

do $t$
declare
  desk_id uuid; desk text; hoy date := public.today_cr(); a uuid; k uuid; plan uuid; f text[] := '{}'; v text;
  cases text[][] := array[
    -- start date relative to today (one month back = paid_through yesterday … ), expected status + days
    array['0', 'active 0'], array['1', 'overdue 1'], array['5', 'overdue 5'], array['6', 'suspended 6'], array['40', 'suspended 40']
  ];
  i int;
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;
  select id into plan from public.plans where sede_id = 'bellavista' and kind = 'membership' and active order by sort_order limit 1;
  insert into public.staff (full_name, role_id) values ('DEMO Admin', 'admin') returning id into a;
  insert into public.staff_sedes values (a, 'bellavista');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at)
    values (encode(extensions.digest('dry-admin','sha256'),'hex'), a, desk_id, now() + interval '5 minutes');
  insert into public.clients (sede_id, full_name) values ('bellavista', 'DEMO Vista') returning id into k;

  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', '{"x-staff-token":"dry-admin"}', true);
  execute 'set local role authenticated';
  perform public.membership_assign(k, plan, hoy);
  for i in 1 .. array_length(cases, 1) loop
    -- due date = start + 1 month after one paid period; start so that due = today - N
    perform public.membership_assign(k, plan, (hoy - cases[i][1]::int - interval '1 month')::date);
    perform public.payment_record_cash(k, 1000, hoy, 1::smallint);
    v := public.dryrun_value(format($q$select status || ' ' || days_overdue from public.membership_overview where client_id = %L$q$, k));
    if v is distinct from cases[i][2] then f := f || format('due %s days ago: got %s, expected %s', cases[i][1], v, cases[i][2]); end if;
  end loop;
  perform public.membership_reactivate(k, 'DEMO');
  v := public.dryrun_value(format($q$select status from public.membership_overview where client_id = %L$q$, k));
  if v is distinct from 'overdue' then f := f || ('reactivated: ' || coalesce(v, 'null'))::text; end if;

  perform set_config('request.headers', '{}', true);
  v := public.dryrun_value($q$select count(*)::text from public.membership_overview$q$);
  if v <> '0' then f := f || ('locked desk sees ' || v)::text; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform 1 from public.membership_overview;
    f := f || 'anon reads the view'::text;
  exception when others then null;
  end;
  execute 'reset role';
  if (select reloptions::text from pg_class where oid = 'public.membership_overview'::regclass) not like '%security_invoker=true%' then
    f := f || 'view lost security_invoker'::text;
  end if;

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'DRYRUN_OK: todas las pruebas de la 0026 pasaron'; end if;
  raise exception 'DRYRUN_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;

$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'DRYRUN_ABORT: sin resultado');
end
$dry$;
