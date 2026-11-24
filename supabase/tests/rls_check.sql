-- PRUEBA DE SEGURIDAD (RLS) del sistema interno. Se puede correr cuantas veces se quiera.
-- NO es una migración y NO guarda nada: crea datos DEMO, prueba quién ve qué y lo deshace.
--
-- Pegá TODO en el SQL Editor de Supabase y dale Run. Siempre termina en "error", a propósito:
--   RLS_OK ...     = nadie ve lo que no debe
--   RLS_FALLAS ... = hay fugas (la lista dice cuáles)
--   cualquier otro = se cayó antes de terminar (igual no guarda nada)
--
-- Cubre (SISTEMA-INTERNO.md, fase 8): datos de otra sede, datos de otro cliente,
-- un coach o un admin sin permiso leyendo la planilla, un cliente leyendo la historia
-- clínica de otro, una computadora bloqueada y alguien sin sesión (anon).

do $rls$
declare resultado text;
begin
  begin
execute $tests$
create function public.rls_denied(p_name text, p_sql text) returns text
language plpgsql as $c$
declare n integer; got text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    got := 'ok:' || n;
  exception when others then got := sqlerrm;
  end;
  if got = 'ok:0' or got like '%permission denied%' or got like '%NOT_ALLOWED%' then return null; end if;
  return p_name || ' => ' || got;
end $c$;
create function public.rls_count(p_sql text) returns integer
language plpgsql as $c$
declare n integer;
begin
  execute p_sql; get diagnostics n = row_count; return n;
exception when others then return -1;
end $c$;
grant execute on function public.rls_denied(text, text), public.rls_count(text) to anon, authenticated;

do $t$
declare
  desk_id uuid; desk text; u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  j1 text; j2 text; c uuid; a uuid; x uuid; k1 uuid; k2 uuid; kc uuid; plan uuid;
  hc text; ha text; hx text; f text[] := '{}'; n integer;
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;
  j1 := json_build_object('sub', u1, 'role', 'authenticated')::text;
  j2 := json_build_object('sub', u2, 'role', 'authenticated')::text;

  -- DEMO people and data (as the owner)
  insert into public.staff (full_name, role_id) values ('DEMO RLS Coach', 'coach') returning id into c;
  insert into public.staff (full_name, role_id) values ('DEMO RLS Admin', 'admin') returning id into a;
  insert into public.staff (full_name, role_id) values ('DEMO RLS Cafe', 'admin') returning id into x;
  insert into public.staff_sedes values (c, 'bellavista'), (a, 'bellavista'), (x, 'cafe');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at) values
    (encode(extensions.digest('rls-c', 'sha256'), 'hex'), c, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('rls-a', 'sha256'), 'hex'), a, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('rls-x', 'sha256'), 'hex'), x, desk_id, now() + interval '5 minutes');
  hc := '{"x-staff-token":"rls-c"}'; ha := '{"x-staff-token":"rls-a"}'; hx := '{"x-staff-token":"rls-x"}';
  insert into public.profiles (id, full_name, role, authorized) values
    (u1, 'DEMO RLS Uno', 'client', true), (u2, 'DEMO RLS Dos', 'client', true);
  insert into public.clients (sede_id, full_name, user_id) values ('bellavista', 'DEMO RLS Uno', u1) returning id into k1;
  insert into public.clients (sede_id, full_name, user_id) values ('bellavista', 'DEMO RLS Dos', u2) returning id into k2;
  insert into public.clients (sede_id, full_name) values ('cafe', 'DEMO RLS Cafe') returning id into kc;
  insert into public.client_clinical_history (client_id, medications) values (k1, 'DEMO'), (k2, 'DEMO'), (kc, 'DEMO');
  insert into public.client_measurements (client_id, height_cm, weight_kg) values (k2, 170, 70), (kc, 170, 70);
  select id into plan from public.plans order by sort_order limit 1;
  insert into public.client_memberships (client_id, plan_id, start_date, periods_paid) values (k2, plan, public.today_cr(), 1), (kc, plan, public.today_cr(), 1);
  insert into public.payments (client_id, amount_crc, paid_on, method) values (k2, 1, public.today_cr(), 'cash'), (kc, 1, public.today_cr(), 'cash');
  insert into public.payment_receipts (client_id, file_path, amount_crc, paid_on) values (k2, k2 || '/demo-rls.jpg', 1, public.today_cr());
  insert into public.client_routines (client_id, sede_id, name, valid_from, valid_weeks, assigned_at) values
    (k2, 'bellavista', 'DEMO', public.today_cr(), 4, now()), (kc, 'cafe', 'DEMO', public.today_cr(), 4, now());
  insert into public.staff_employment (staff_id, pay_type, rate) values (c, 'monthly', 1), (a, 'monthly', 1);
  insert into public.payroll_runs (period, period_start, period_end) values ('monthly', '2001-01-01', '2001-01-31');
  insert into public.staff_time_entries (staff_id, sede_id, clock_in, clock_out) values
    (a, 'bellavista', now() - interval '2 hours', now() - interval '1 hour'),
    (x, 'cafe', now() - interval '2 hours', now() - interval '1 hour');

  -- A client (DEMO RLS Uno) -----------------------------------------------------------------
  perform set_config('request.jwt.claims', j1, true);
  perform set_config('request.headers', '{}', true);
  execute 'set local role authenticated';
  n := public.rls_count('select 1 from public.clients');
  if n <> 1 then f := f || ('client sees ' || n || ' client files')::text; end if;
  f := f || public.rls_denied('client: other clinical history', format($q$select 1 from public.client_clinical_history where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other measurements', format($q$select 1 from public.client_measurements where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other memberships', format($q$select 1 from public.client_memberships where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other payments', format($q$select 1 from public.payments where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other receipts', format($q$select 1 from public.payment_receipts where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other routines', format($q$select 1 from public.client_routines where client_id is distinct from %L$q$, k1));
  f := f || public.rls_denied('client: other overview', format($q$select 1 from public.membership_overview where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: other reservations', format($q$select 1 from public.class_reservations where client_id <> %L$q$, k1));
  f := f || public.rls_denied('client: staff', $q$select 1 from public.staff$q$);
  f := f || public.rls_denied('client: employment', $q$select 1 from public.staff_employment$q$);
  f := f || public.rls_denied('client: payroll runs', $q$select 1 from public.payroll_runs$q$);
  f := f || public.rls_denied('client: payroll lines', $q$select 1 from public.payroll_lines$q$);
  f := f || public.rls_denied('client: time entries', $q$select 1 from public.staff_time_entries$q$);
  f := f || public.rls_denied('client: edits other client', format($q$update public.clients set full_name = 'X' where id = %L$q$, k2));
  f := f || public.rls_denied('client: payroll people', $q$select * from public.payroll_people()$q$);

  -- The other client sees their own clinical data, not the first one's
  perform set_config('request.jwt.claims', j2, true);
  f := f || public.rls_denied('client 2: client 1 clinical history', format($q$select 1 from public.client_clinical_history where client_id = %L$q$, k1));

  -- Coach of Bellavista -------------------------------------------------------------------------
  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', hc, true);
  n := public.rls_count($q$select 1 from public.clients where full_name like 'DEMO RLS%'$q$);
  if n <> 2 then f := f || ('coach sees ' || n || ' DEMO clients (expected the 2 of Bellavista)')::text; end if;
  f := f || public.rls_denied('coach: cafe clients', $q$select 1 from public.clients where sede_id = 'cafe'$q$);
  f := f || public.rls_denied('coach: cafe clinical history', format($q$select 1 from public.client_clinical_history where client_id = %L$q$, kc));
  f := f || public.rls_denied('coach: cafe measurements', format($q$select 1 from public.client_measurements where client_id = %L$q$, kc));
  f := f || public.rls_denied('coach: cafe payments', format($q$select 1 from public.payments where client_id = %L$q$, kc));
  f := f || public.rls_denied('coach: cafe routines', $q$select 1 from public.client_routines where sede_id = 'cafe'$q$);
  f := f || public.rls_denied('coach: employment', $q$select 1 from public.staff_employment$q$);
  f := f || public.rls_denied('coach: payroll runs', $q$select 1 from public.payroll_runs$q$);
  f := f || public.rls_denied('coach: payroll lines', $q$select 1 from public.payroll_lines$q$);
  f := f || public.rls_denied('coach: payroll rates', $q$select 1 from public.payroll_rates$q$);
  f := f || public.rls_denied('coach: vacations', $q$select 1 from public.staff_vacations$q$);
  f := f || public.rls_denied('coach: others time entries', format($q$select 1 from public.staff_time_entries where staff_id <> %L$q$, c));
  f := f || public.rls_denied('coach: payroll people', $q$select * from public.payroll_people()$q$);
  f := f || public.rls_denied('coach: pins', $q$select 1 from public.staff_pins$q$);
  f := f || public.rls_denied('coach: sessions', $q$select 1 from public.staff_sessions$q$);

  -- Admin of Bellavista without payroll ---------------------------------------------------------------
  perform set_config('request.headers', ha, true);
  f := f || public.rls_denied('admin: cafe clients', $q$select 1 from public.clients where sede_id = 'cafe'$q$);
  f := f || public.rls_denied('admin: cafe time entries', $q$select 1 from public.staff_time_entries where sede_id = 'cafe'$q$);
  f := f || public.rls_denied('admin: employment', $q$select 1 from public.staff_employment$q$);
  f := f || public.rls_denied('admin: payroll runs', $q$select 1 from public.payroll_runs$q$);
  f := f || public.rls_denied('admin: grants self payroll', format($q$update public.staff set can_manage_payroll = true where id = %L$q$, a));
  n := public.rls_count($q$select 1 from public.staff where can_manage_payroll and full_name = 'DEMO RLS Admin'$q$);
  if n <> 0 then f := f || 'admin granted themself payroll'::text; end if;

  -- Admin of Café ----------------------------------------------------------------------------------------
  perform set_config('request.headers', hx, true);
  f := f || public.rls_denied('cafe admin: bellavista clients', $q$select 1 from public.clients where sede_id = 'bellavista'$q$);
  f := f || public.rls_denied('cafe admin: bellavista clinical', format($q$select 1 from public.client_clinical_history where client_id in (%L, %L)$q$, k1, k2));
  f := f || public.rls_denied('cafe admin: bellavista receipts', format($q$select 1 from public.payment_receipts where client_id = %L$q$, k2));
  f := f || public.rls_denied('cafe admin: edits bellavista client', format($q$update public.clients set full_name = 'X' where id = %L$q$, k1));

  -- Desk with no PIN session ---------------------------------------------------------------------------------
  perform set_config('request.headers', '{}', true);
  f := f || public.rls_denied('locked desk: clients', $q$select 1 from public.clients$q$);
  f := f || public.rls_denied('locked desk: clinical', $q$select 1 from public.client_clinical_history$q$);
  f := f || public.rls_denied('locked desk: payments', $q$select 1 from public.payments$q$);
  f := f || public.rls_denied('locked desk: staff', $q$select 1 from public.staff$q$);
  f := f || public.rls_denied('locked desk: time entries', $q$select 1 from public.staff_time_entries$q$);

  -- Nobody signed in -------------------------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  f := f || public.rls_denied('anon: clients', $q$select 1 from public.clients$q$);
  f := f || public.rls_denied('anon: clinical', $q$select 1 from public.client_clinical_history$q$);
  f := f || public.rls_denied('anon: measurements', $q$select 1 from public.client_measurements$q$);
  f := f || public.rls_denied('anon: payments', $q$select 1 from public.payments$q$);
  f := f || public.rls_denied('anon: receipts', $q$select 1 from public.payment_receipts$q$);
  f := f || public.rls_denied('anon: staff', $q$select 1 from public.staff$q$);
  f := f || public.rls_denied('anon: employment', $q$select 1 from public.staff_employment$q$);
  f := f || public.rls_denied('anon: payroll', $q$select 1 from public.payroll_lines$q$);
  f := f || public.rls_denied('anon: profiles', $q$select 1 from public.profiles$q$);
  f := f || public.rls_denied('anon: preauthorized emails', $q$select 1 from public.preauthorized_emails$q$);
  f := f || public.rls_denied('anon: waitlist', $q$select 1 from public.waitlist$q$);
  f := f || public.rls_denied('anon: legacy measurements', $q$select 1 from public.measurements$q$);
  f := f || public.rls_denied('anon: reservations', $q$select 1 from public.class_reservations$q$);
  execute 'reset role';

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'RLS_OK: nadie ve lo que no debe'; end if;
  raise exception 'RLS_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;
$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'RLS_ABORT: sin resultado');
end
$rls$;
