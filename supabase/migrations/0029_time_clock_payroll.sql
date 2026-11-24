-- 0029: employee records, PIN time clock, vacations and payroll (phase 7).
-- Run in the Supabase SQL editor after supabase/dry-runs/0029_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023–0028.
--
-- MODEL
--   * staff_employment: the payroll side of a person (cédula, position, hire date,
--     IBAN, pay type and rate). One row per staff member. Payroll holders only.
--   * staff_time_entries: the time clock. A person picks their name on a desk and
--     types their PIN (no desk session needed): staff_clock() opens an entry or
--     closes the open one. attendance.manage corrects entries; every correction
--     records who made it.
--   * staff_vacations: days taken. The balance is computed on read
--     (payroll_people()), never stored.
--   * payroll_rates: CCSS, Banco Popular and income-tax brackets. Settings, not code.
--     Seeded EMPTY: they must come from Jeremy's accountant (PROGRESS.md).
--   * payroll_runs + payroll_lines: a run is a document. Its lines are computed by
--     payroll_run_compute() while it is a draft and frozen once approved, so a later
--     rate change never rewrites a payroll already paid.
--   * Aguinaldo (Dec 1 – Nov 30 earnings / 12) is computed on read from approved and
--     paid runs; it is shown, never paid automatically.
--
-- WHO SEES WHAT
--   payroll.manage (staff.can_manage_payroll) → employment data, rates, runs, lines
--     and vacations of staff who share one of their sedes. Strictest RLS here:
--     nobody else, admins included, reads a salary or an IBAN.
--   attendance.manage → every time entry of their sedes; corrections.
--   any unlocked staff → their own time entries.
--   desk (no session) → staff_clock() and desk_clock_status() only.

-- 1. Permissions --------------------------------------------------------------------------
-- attendance.manage already exists (0023) and admin holds it.

-- 2. Employment data ------------------------------------------------------------------------
create table if not exists public.staff_employment (
  staff_id         uuid primary key references public.staff (id) on delete cascade,
  cedula           text check (cedula is null or char_length(btrim(cedula)) between 5 and 30),
  job_title         text check (job_title is null or char_length(btrim(job_title)) between 2 and 80),
  hire_date        date,
  iban             text check (iban is null or iban ~ '^CR[0-9]{20}$'),
  pay_type         text not null default 'monthly' check (pay_type in ('monthly', 'hourly', 'per_class')),
  rate             numeric(12, 2) check (rate is null or rate between 0 and 100000000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null
);
comment on table public.staff_employment is 'Payroll data of a staff member. Readable only by payroll holders.';

drop trigger if exists stamp_staff_audit on public.staff_employment;
create trigger stamp_staff_audit before insert or update on public.staff_employment
  for each row execute function public.stamp_staff_audit();

-- 3. Time clock ---------------------------------------------------------------------------------
create table if not exists public.staff_time_entries (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references public.staff (id) on delete cascade,
  sede_id          text not null references public.sedes (id),
  clock_in         timestamptz not null,
  clock_out        timestamptz,
  source           text not null default 'pin' check (source in ('pin', 'manual')),
  note             text check (note is null or char_length(note) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null,
  constraint staff_time_entries_order_check check (clock_out is null or clock_out > clock_in),
  constraint staff_time_entries_length_check check (clock_out is null or clock_out - clock_in <= interval '16 hours')
);
create index if not exists staff_time_entries_staff_idx on public.staff_time_entries (staff_id, clock_in);
create index if not exists staff_time_entries_sede_idx on public.staff_time_entries (sede_id, clock_in);
-- One open entry per person.
create unique index if not exists staff_time_entries_open_idx on public.staff_time_entries (staff_id) where clock_out is null;

drop trigger if exists stamp_staff_audit on public.staff_time_entries;
create trigger stamp_staff_audit before insert or update on public.staff_time_entries
  for each row execute function public.stamp_staff_audit();

-- 4. Vacations ---------------------------------------------------------------------------------------
create table if not exists public.staff_vacations (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references public.staff (id) on delete cascade,
  start_date       date not null,
  days             numeric(5, 1) not null check (days > 0 and days <= 60),
  note             text check (note is null or char_length(note) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by_staff uuid references public.staff (id) on delete set null,
  updated_by_staff uuid references public.staff (id) on delete set null
);
create index if not exists staff_vacations_staff_idx on public.staff_vacations (staff_id, start_date);

drop trigger if exists stamp_staff_audit on public.staff_vacations;
create trigger stamp_staff_audit before insert or update on public.staff_vacations
  for each row execute function public.stamp_staff_audit();

-- 5. Rates ---------------------------------------------------------------------------------------------
create table if not exists public.payroll_rates (
  key              text primary key check (key in (
                     'period', 'ccss_employee_pct', 'ccss_employer_pct', 'banco_popular_pct',
                     'income_tax_brackets', 'vacation_days_per_50_weeks')),
  value            jsonb not null,
  label            text not null,
  updated_at       timestamptz not null default now(),
  updated_by_staff uuid references public.staff (id) on delete set null,
  constraint payroll_rates_shape_check check (
    case key
      when 'period' then value in ('"monthly"', '"biweekly"', '"weekly"')
      when 'income_tax_brackets' then jsonb_typeof(value) = 'array'
      else value = 'null' or (jsonb_typeof(value) = 'number' and (value #>> '{}')::numeric between 0 and 100)
    end
  )
);
comment on table public.payroll_rates is 'Payroll rates. Seeded empty: values come from the accountant, never from code.';

insert into public.payroll_rates (key, value, label) values
  ('period',                     '"monthly"', 'Frecuencia de la planilla'),
  ('ccss_employee_pct',          'null',      'CCSS, parte del trabajador (%)'),
  ('ccss_employer_pct',          'null',      'CCSS, cargas del patrono (%)'),
  ('banco_popular_pct',          'null',      'Banco Popular, parte del trabajador (%)'),
  ('income_tax_brackets',        '[]',        'Impuesto sobre la renta: tramos mensuales'),
  ('vacation_days_per_50_weeks', 'null',      'Días de vacaciones por cada 50 semanas')
on conflict (key) do nothing;

drop trigger if exists stamp_setting_audit on public.payroll_rates;
create trigger stamp_setting_audit before update on public.payroll_rates
  for each row execute function public.stamp_setting_audit();

-- Brackets: [{"from": 0, "to": 922000, "pct": 0}, {"from": 922000, "to": null, "pct": 10}, …]
-- monthly colones, "to" null = no upper limit. Checked on write.
create or replace function public.payroll_brackets_valid(p jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p) = 'array' and not exists (
    select 1 from jsonb_array_elements(p) b
    where jsonb_typeof(b) <> 'object'
       or jsonb_typeof(b -> 'from') <> 'number'
       or jsonb_typeof(b -> 'pct') <> 'number'
       or (b -> 'to' is not null and b -> 'to' <> 'null' and jsonb_typeof(b -> 'to') <> 'number')
       or (b ->> 'from')::numeric < 0
       or (b ->> 'pct')::numeric not between 0 and 100
       or (b ->> 'to' is not null and (b ->> 'to')::numeric <= (b ->> 'from')::numeric)
  );
$$;

alter table public.payroll_rates drop constraint if exists payroll_rates_brackets_check;
alter table public.payroll_rates add constraint payroll_rates_brackets_check check (
  key <> 'income_tax_brackets' or public.payroll_brackets_valid(value)
);

-- 6. Runs and lines -----------------------------------------------------------------------------------------
create table if not exists public.payroll_runs (
  id                uuid primary key default gen_random_uuid(),
  period            text not null check (period in ('monthly', 'biweekly', 'weekly')),
  period_start      date not null,
  period_end        date not null,
  status            text not null default 'draft' check (status in ('draft', 'approved', 'paid')),
  rates             jsonb not null default '{}',
  note              text check (note is null or char_length(note) <= 500),
  computed_at       timestamptz,
  approved_at       timestamptz,
  approved_by_staff uuid references public.staff (id) on delete set null,
  paid_at           timestamptz,
  paid_by_staff     uuid references public.staff (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by_staff  uuid references public.staff (id) on delete set null,
  updated_by_staff  uuid references public.staff (id) on delete set null,
  constraint payroll_runs_range_check check (period_end >= period_start and period_end - period_start <= 31),
  unique (period_start, period_end)
);
comment on table public.payroll_runs is 'One payroll per period. Lines are recomputed while draft and frozen once approved.';

drop trigger if exists stamp_staff_audit on public.payroll_runs;
create trigger stamp_staff_audit before insert or update on public.payroll_runs
  for each row execute function public.stamp_staff_audit();

create table if not exists public.payroll_lines (
  id                 uuid primary key default gen_random_uuid(),
  run_id             uuid not null references public.payroll_runs (id) on delete cascade,
  staff_id           uuid not null references public.staff (id),
  pay_type           text not null check (pay_type in ('monthly', 'hourly', 'per_class')),
  rate               numeric(12, 2) not null default 0,
  -- Months (fraction), hours or classes. Hours and classes come from the clock and
  -- the schedule; quantity_override replaces them when someone corrects it.
  quantity           numeric(8, 2) not null default 0,
  quantity_override  numeric(8, 2) check (quantity_override is null or quantity_override between 0 and 999),
  bonus              numeric(12, 2) not null default 0 check (bonus between 0 and 100000000),
  other_deductions   numeric(12, 2) not null default 0 check (other_deductions between 0 and 100000000),
  note               text check (note is null or char_length(note) <= 300),
  gross              numeric(12, 2) not null default 0,
  ccss_employee      numeric(12, 2) not null default 0,
  banco_popular      numeric(12, 2) not null default 0,
  income_tax         numeric(12, 2) not null default 0,
  net                numeric(12, 2) not null default 0,
  employer_charges   numeric(12, 2) not null default 0,
  updated_at         timestamptz not null default now(),
  updated_by_staff   uuid references public.staff (id) on delete set null,
  unique (run_id, staff_id)
);
create index if not exists payroll_lines_staff_idx on public.payroll_lines (staff_id);

-- 7. Helpers ---------------------------------------------------------------------------------------------------
-- Checks a PIN with the same attempt counter and lock as staff_unlock().
-- Internal: never granted to anon or authenticated.
create or replace function public.staff_pin_ok(p_staff_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin public.staff_pins%rowtype;
  v_max integer := public.setting_int('staff.pin_max_attempts', 5);
begin
  select * into v_pin from public.staff_pins where staff_id = p_staff_id for update;
  if v_pin.staff_id is null then return 'NO_PIN'; end if;
  if v_pin.locked_until is not null and v_pin.locked_until > now() then return 'PIN_LOCKED'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$'
     or extensions.crypt(p_pin, v_pin.pin_hash) <> v_pin.pin_hash then
    update public.staff_pins
    set failed_attempts = failed_attempts + 1,
        locked_until = case when failed_attempts + 1 >= v_max
          then now() + make_interval(mins => public.setting_int('staff.pin_lock_minutes', 15))
          else null end
    where staff_id = p_staff_id;
    return 'WRONG_PIN';
  end if;
  update public.staff_pins set failed_attempts = 0, locked_until = null where staff_id = p_staff_id;
  return 'OK';
end;
$$;

-- Does the acting payroll holder share a sede with this person?
create or replace function public.payroll_can_see(p_staff_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.staff_can('payroll.manage'), false) and exists (
    select 1 from public.staff_sedes ss
    where ss.staff_id = p_staff_id and ss.sede_id in (select public.staff_sede_ids())
  );
$$;

-- 8. Time clock RPCs -----------------------------------------------------------------------------------------
-- Clock in or out with name + PIN on a desk. No desk session needed, and it never
-- opens one. Returns {"ok": true, "action": "in"|"out", "at": …} or
-- {"ok": false, "error": …}; a wrong PIN returns instead of raising, so the
-- attempt counter sticks.
create or replace function public.staff_clock(p_staff_id uuid, p_pin text, p_sede_id text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check text;
  v_sedes text[];
  v_sede  text;
  v_open  public.staff_time_entries%rowtype;
  v_now   timestamptz := clock_timestamp();  -- the real moment of the tap, not the transaction start
begin
  if not public.is_desk() then
    raise exception 'NO_DESK' using errcode = '42501';
  end if;
  select array_agg(ss.sede_id order by ss.sede_id) into v_sedes
  from public.staff st
  join public.staff_sedes ss on ss.staff_id = st.id
  where st.id = p_staff_id and st.active and ss.sede_id in (select public.desk_sede_ids());
  if v_sedes is null then
    raise exception 'STAFF_NOT_HERE' using errcode = '42501';
  end if;

  if p_sede_id is not null and not p_sede_id = any (v_sedes) then
    raise exception 'SEDE_NOT_ALLOWED' using errcode = '42501';
  end if;

  v_check := public.staff_pin_ok(p_staff_id, p_pin);
  if v_check <> 'OK' then
    return json_build_object('ok', false, 'error', v_check);
  end if;

  select * into v_open from public.staff_time_entries
  where staff_id = p_staff_id and clock_out is null for update;

  if v_open.id is not null then
    -- Forgot to clock out yesterday: the open entry stays for a manager to fix,
    -- and this tap starts a new one instead of making a 30-hour shift.
    if v_now - v_open.clock_in > interval '16 hours' then
      update public.staff_time_entries
      set note = coalesce(note || ' · ', '') || 'Sin salida marcada', clock_out = v_open.clock_in + interval '1 minute'
      where id = v_open.id;
    else
      update public.staff_time_entries set clock_out = v_now where id = v_open.id;
      return json_build_object('ok', true, 'action', 'out', 'at', v_now, 'since', v_open.clock_in);
    end if;
  end if;

  if p_sede_id is not null then
    v_sede := p_sede_id;
  elsif cardinality(v_sedes) = 1 then
    v_sede := v_sedes[1];
  else
    return json_build_object('ok', false, 'error', 'SEDE_REQUIRED', 'sedes', v_sedes);
  end if;

  insert into public.staff_time_entries (staff_id, sede_id, clock_in, source)
  values (p_staff_id, v_sede, v_now, 'pin');
  return json_build_object('ok', true, 'action', 'in', 'at', v_now, 'sede_id', v_sede);
end;
$$;

-- Who is clocked in now, for the lock screen: names only.
create or replace function public.desk_clock_status()
returns table (staff_id uuid, full_name text, sede_id text, clock_in timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select st.id, st.full_name, e.sede_id, e.clock_in
  from public.staff_time_entries e
  join public.staff st on st.id = e.staff_id and st.active
  where public.is_desk()
    and e.clock_out is null
    and e.clock_in > now() - interval '16 hours'
    and e.sede_id in (select public.desk_sede_ids())
  order by e.clock_in;
$$;

-- Corrections and manual entries (attendance.manage in that sede).
-- p_entry keys: staff_id, sede_id (new only), clock_in, clock_out, note.
create or replace function public.time_entry_save(p_id uuid, p_entry jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  public.staff_time_entries%rowtype;
  v_in   timestamptz := (p_entry ->> 'clock_in')::timestamptz;
  v_out  timestamptz := nullif(p_entry ->> 'clock_out', '')::timestamptz;
  v_note text := nullif(btrim(coalesce(p_entry ->> 'note', '')), '');
  v_id   uuid;
begin
  if p_id is null then
    if not coalesce(public.staff_can('attendance.manage')
                    and (p_entry ->> 'sede_id') in (select public.staff_sede_ids()), false) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
    if not exists (select 1 from public.staff_sedes
                   where staff_id = (p_entry ->> 'staff_id')::uuid and sede_id = p_entry ->> 'sede_id') then
      raise exception 'STAFF_NOT_HERE' using errcode = '42501';
    end if;
    if v_in is null or v_in > now() or (v_out is not null and v_out > now()) then
      raise exception 'TIME_IN_FUTURE' using errcode = '22023';
    end if;
    insert into public.staff_time_entries (staff_id, sede_id, clock_in, clock_out, source, note)
    values ((p_entry ->> 'staff_id')::uuid, p_entry ->> 'sede_id', v_in, v_out, 'manual', v_note)
    returning id into v_id;
    return v_id;
  end if;

  select * into v_row from public.staff_time_entries where id = p_id for update;
  if v_row.id is null or not coalesce(public.staff_can('attendance.manage')
                                      and v_row.sede_id in (select public.staff_sede_ids()), false) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if v_in is null or v_in > now() or (v_out is not null and v_out > now()) then
    raise exception 'TIME_IN_FUTURE' using errcode = '22023';
  end if;
  update public.staff_time_entries
  set clock_in = v_in, clock_out = v_out, note = v_note
  where id = p_id;
  return p_id;
end;
$$;

create or replace function public.time_entry_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.staff_time_entries
  where id = p_id
    and coalesce(public.staff_can('attendance.manage'), false)
    and sede_id in (select public.staff_sede_ids());
  if not found then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
end;
$$;

-- 9. Payroll RPCs ------------------------------------------------------------------------------------------------
create or replace function public.payroll_require()
returns void
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not coalesce(public.staff_can('payroll.manage'), false) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
end;
$$;

-- Employment data: payroll holders only, for staff who share a sede with them.
create or replace function public.employment_save(p_staff_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.payroll_can_see(p_staff_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.staff_employment as e (staff_id, cedula, job_title, hire_date, iban, pay_type, rate)
  values (
    p_staff_id,
    nullif(btrim(coalesce(p_data ->> 'cedula', '')), ''),
    nullif(btrim(coalesce(p_data ->> 'job_title', '')), ''),
    nullif(p_data ->> 'hire_date', '')::date,
    nullif(upper(replace(coalesce(p_data ->> 'iban', ''), ' ', '')), ''),
    coalesce(nullif(p_data ->> 'pay_type', ''), 'monthly'),
    nullif(p_data ->> 'rate', '')::numeric
  )
  on conflict (staff_id) do update set
    cedula = excluded.cedula, job_title = excluded.job_title, hire_date = excluded.hire_date,
    iban = excluded.iban, pay_type = excluded.pay_type, rate = excluded.rate;
end;
$$;

create or replace function public.payroll_rate_set(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.payroll_require();
  update public.payroll_rates set value = p_value where key = p_key;
  if not found then
    raise exception 'UNKNOWN_RATE' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.vacation_save(p_staff_id uuid, p_start date, p_days numeric, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.payroll_can_see(p_staff_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  insert into public.staff_vacations (staff_id, start_date, days, note)
  values (p_staff_id, p_start, p_days, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.vacation_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.staff_vacations v where v.id = p_id and public.payroll_can_see(v.staff_id);
  if not found then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
end;
$$;

-- Monthly income tax for a monthly-equivalent gross, from the brackets.
create or replace function public.payroll_income_tax(p_monthly numeric, p_brackets jsonb)
returns numeric
language sql
immutable
set search_path = public
as $$
  select coalesce(sum(
    greatest(0, least(p_monthly, coalesce((b ->> 'to')::numeric, p_monthly)) - (b ->> 'from')::numeric)
    * (b ->> 'pct')::numeric / 100), 0)
  from jsonb_array_elements(coalesce(p_brackets, '[]')) b
  where p_monthly > (b ->> 'from')::numeric;
$$;

-- Share of a month one period represents.
create or replace function public.payroll_period_factor(p_period text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case p_period when 'monthly' then 1 when 'biweekly' then 0.5 else 12.0 / 52 end;
$$;

-- Recomputes one line from its inputs and the run's frozen rates.
create or replace function public.payroll_line_compute(p_line_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l      public.payroll_lines%rowtype;
  r      public.payroll_runs%rowtype;
  v_qty  numeric;
  v_gross numeric;
  v_factor numeric;
  v_ccss numeric; v_bp numeric; v_tax numeric; v_emp numeric;
begin
  select * into l from public.payroll_lines where id = p_line_id;
  select * into r from public.payroll_runs where id = l.run_id;
  v_factor := public.payroll_period_factor(r.period);
  v_qty := coalesce(l.quantity_override, l.quantity);
  v_gross := round(l.rate * v_qty + l.bonus, 2);
  v_ccss := round(v_gross * coalesce((r.rates ->> 'ccss_employee_pct')::numeric, 0) / 100, 2);
  v_bp   := round(v_gross * coalesce((r.rates ->> 'banco_popular_pct')::numeric, 0) / 100, 2);
  v_emp  := round(v_gross * coalesce((r.rates ->> 'ccss_employer_pct')::numeric, 0) / 100, 2);
  v_tax  := round(public.payroll_income_tax(v_gross / v_factor, r.rates -> 'income_tax_brackets') * v_factor, 2);
  update public.payroll_lines set
    gross = v_gross, ccss_employee = v_ccss, banco_popular = v_bp, income_tax = v_tax,
    employer_charges = v_emp,
    net = v_gross - v_ccss - v_bp - v_tax - other_deductions,
    updated_at = now(), updated_by_staff = public.current_staff_id()
  where id = p_line_id;
end;
$$;

-- Creates a draft run for a period. The period type comes from the rates.
create or replace function public.payroll_run_create(p_period_start date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text;
  v_end    date;
  v_id     uuid;
begin
  perform public.payroll_require();
  select value #>> '{}' into v_period from public.payroll_rates where key = 'period';
  v_period := coalesce(v_period, 'monthly');
  if p_period_start is null then
    raise exception 'PERIOD_REQUIRED' using errcode = '22023';
  end if;
  if v_period = 'monthly' then
    p_period_start := date_trunc('month', p_period_start)::date;
    v_end := (p_period_start + interval '1 month - 1 day')::date;
  elsif v_period = 'biweekly' then
    v_end := p_period_start + 13;
  else
    v_end := p_period_start + 6;
  end if;
  insert into public.payroll_runs (period, period_start, period_end)
  values (v_period, p_period_start, v_end)
  returning id into v_id;
  perform public.payroll_run_compute(v_id);
  return v_id;
exception when unique_violation then
  raise exception 'RUN_EXISTS' using errcode = '23505';
end;
$$;

-- (Re)builds every line of a draft: one per active staff member with employment
-- data whom this holder can see. Keeps manual overrides, bonuses and deductions.
create or replace function public.payroll_run_compute(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r       public.payroll_runs%rowtype;
  v_rates jsonb;
  e       record;
  v_qty   numeric;
  v_from  timestamptz;
  v_to    timestamptz;
  v_line  uuid;
begin
  perform public.payroll_require();
  select * into r from public.payroll_runs where id = p_run_id for update;
  if r.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if r.status <> 'draft' then raise exception 'RUN_NOT_DRAFT' using errcode = '22023'; end if;

  select jsonb_object_agg(key, value) into v_rates from public.payroll_rates;
  update public.payroll_runs set rates = v_rates, computed_at = now() where id = p_run_id;

  v_from := (r.period_start::timestamp at time zone 'America/Costa_Rica');
  v_to   := ((r.period_end + 1)::timestamp at time zone 'America/Costa_Rica');

  -- People who left the run's scope (deactivated, no employment data) drop out.
  delete from public.payroll_lines l
  where l.run_id = p_run_id and public.payroll_can_see(l.staff_id)
    and not exists (select 1 from public.staff st join public.staff_employment em on em.staff_id = st.id
                    where st.id = l.staff_id and st.active and em.rate is not null);

  for e in
    select st.id, em.pay_type, em.rate
    from public.staff st
    join public.staff_employment em on em.staff_id = st.id
    where st.active and em.rate is not null and public.payroll_can_see(st.id)
  loop
    v_qty := case e.pay_type
      when 'monthly' then public.payroll_period_factor(r.period)
      when 'hourly' then coalesce((
        select round(sum(extract(epoch from (least(t.clock_out, v_to) - greatest(t.clock_in, v_from))) / 3600)::numeric, 2)
        from public.staff_time_entries t
        where t.staff_id = e.id and t.clock_out is not null
          and t.clock_in < v_to and t.clock_out > v_from), 0)
      else (
        select count(*) from public.classes c
        where c.coach_staff_id = e.id and c.status = 'scheduled'
          and c.starts_at >= v_from and c.starts_at < v_to and c.ends_at <= now())
    end;
    insert into public.payroll_lines as pl (run_id, staff_id, pay_type, rate, quantity)
    values (p_run_id, e.id, e.pay_type, e.rate, v_qty)
    on conflict (run_id, staff_id) do update
      set pay_type = excluded.pay_type, rate = excluded.rate, quantity = excluded.quantity,
          -- an override for another pay type means nothing anymore
          quantity_override = case when pl.pay_type = excluded.pay_type then pl.quantity_override end
    returning id into v_line;
    perform public.payroll_line_compute(v_line);
  end loop;
end;
$$;

-- Edits on a draft line: corrected quantity, bonus, other deductions, note.
create or replace function public.payroll_line_update(p_line_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.payroll_lines%rowtype;
begin
  perform public.payroll_require();
  select * into l from public.payroll_lines where id = p_line_id for update;
  if l.id is null or not public.payroll_can_see(l.staff_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if (select status from public.payroll_runs where id = l.run_id) <> 'draft' then
    raise exception 'RUN_NOT_DRAFT' using errcode = '22023';
  end if;
  update public.payroll_lines set
    quantity_override = nullif(p_data ->> 'quantity_override', '')::numeric,
    bonus = coalesce(nullif(p_data ->> 'bonus', '')::numeric, 0),
    other_deductions = coalesce(nullif(p_data ->> 'other_deductions', '')::numeric, 0),
    note = nullif(btrim(coalesce(p_data ->> 'note', '')), '')
  where id = p_line_id;
  perform public.payroll_line_compute(p_line_id);
end;
$$;

-- draft → approved → paid; approved can go back to draft before it is paid.
create or replace function public.payroll_run_set_status(p_run_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
  v_me  uuid := public.current_staff_id();
begin
  perform public.payroll_require();
  select status into v_old from public.payroll_runs where id = p_run_id for update;
  if v_old is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if (v_old, p_status) = ('draft', 'approved') then
    if not exists (select 1 from public.payroll_lines where run_id = p_run_id) then
      raise exception 'RUN_EMPTY' using errcode = '22023';
    end if;
    update public.payroll_runs set status = 'approved', approved_at = now(), approved_by_staff = v_me where id = p_run_id;
  elsif (v_old, p_status) = ('approved', 'paid') then
    update public.payroll_runs set status = 'paid', paid_at = now(), paid_by_staff = v_me where id = p_run_id;
  elsif (v_old, p_status) = ('approved', 'draft') then
    update public.payroll_runs set status = 'draft', approved_at = null, approved_by_staff = null where id = p_run_id;
  else
    raise exception 'BAD_TRANSITION' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.payroll_run_delete(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.payroll_require();
  delete from public.payroll_runs where id = p_run_id and status = 'draft';
  if not found then
    raise exception 'RUN_NOT_DRAFT' using errcode = '22023';
  end if;
end;
$$;

-- Aguinaldo and vacation balance per person, computed on read.
-- Aguinaldo: gross of approved/paid runs whose period ends Dec 1 – Nov 30 / 12.
-- Vacations: days per 50 weeks (rate) × weeks since hire / 50 − days taken.
create or replace function public.payroll_people()
returns table (
  staff_id uuid, full_name text, active boolean, job_title text, hire_date date,
  pay_type text, rate numeric, has_iban boolean,
  aguinaldo_from date, aguinaldo_to date, aguinaldo numeric,
  vacation_accrued numeric, vacation_taken numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
#variable_conflict use_column
declare
  v_today date := public.today_cr();
  v_from  date;
  v_days  numeric;
begin
  perform public.payroll_require();
  v_from := make_date(extract(year from v_today)::integer - case when extract(month from v_today) = 12 then 0 else 1 end, 12, 1);
  select (value #>> '{}')::numeric into v_days from public.payroll_rates
  where key = 'vacation_days_per_50_weeks' and value <> 'null';
  return query
  select st.id, st.full_name, st.active, em.job_title, em.hire_date, em.pay_type, em.rate, em.iban is not null,
         v_from, (v_from + interval '1 year - 1 day')::date,
         round(coalesce((
           select sum(pl.gross) from public.payroll_lines pl
           join public.payroll_runs pr on pr.id = pl.run_id
           where pl.staff_id = st.id and pr.status in ('approved', 'paid')
             and pr.period_end between v_from and (v_from + interval '1 year - 1 day')::date), 0) / 12, 2),
         case when v_days is null or em.hire_date is null then null
              else round(v_days * greatest(0, (v_today - em.hire_date)) / 7.0 / 50, 1) end,
         coalesce((select sum(v.days) from public.staff_vacations v where v.staff_id = st.id), 0)
  from public.staff st
  left join public.staff_employment em on em.staff_id = st.id
  where public.payroll_can_see(st.id)
  order by st.active desc, st.full_name;
end;
$$;

-- 10. RLS -------------------------------------------------------------------------------------------------------
alter table public.staff_employment enable row level security;
alter table public.staff_time_entries enable row level security;
alter table public.staff_vacations enable row level security;
alter table public.payroll_rates enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_lines enable row level security;

drop policy if exists "payroll reads employment" on public.staff_employment;
create policy "payroll reads employment" on public.staff_employment for select to authenticated
  using ((select public.payroll_can_see(staff_id)));

drop policy if exists "staff reads time entries" on public.staff_time_entries;
create policy "staff reads time entries" on public.staff_time_entries for select to authenticated
  using (
    staff_id = (select public.current_staff_id())
    or ((select public.staff_can('attendance.manage')) and sede_id in (select public.staff_sede_ids()))
    or (select public.payroll_can_see(staff_id))
  );

drop policy if exists "payroll reads vacations" on public.staff_vacations;
create policy "payroll reads vacations" on public.staff_vacations for select to authenticated
  using ((select public.payroll_can_see(staff_id)));

drop policy if exists "payroll reads rates" on public.payroll_rates;
create policy "payroll reads rates" on public.payroll_rates for select to authenticated
  using ((select public.staff_can('payroll.manage')));

drop policy if exists "payroll reads runs" on public.payroll_runs;
create policy "payroll reads runs" on public.payroll_runs for select to authenticated
  using ((select public.staff_can('payroll.manage')));

drop policy if exists "payroll reads lines" on public.payroll_lines;
create policy "payroll reads lines" on public.payroll_lines for select to authenticated
  using ((select public.payroll_can_see(staff_id)));

-- 11. Grants -----------------------------------------------------------------------------------------------------
-- Reads only: every write goes through the RPCs above.
revoke all on public.staff_employment, public.staff_time_entries, public.staff_vacations,
  public.payroll_rates, public.payroll_runs, public.payroll_lines from public, anon, authenticated;
grant select on public.staff_employment, public.staff_time_entries, public.staff_vacations,
  public.payroll_rates, public.payroll_runs, public.payroll_lines to authenticated;
grant all on public.staff_employment, public.staff_time_entries, public.staff_vacations,
  public.payroll_rates, public.payroll_runs, public.payroll_lines to service_role;

revoke execute on function
  public.payroll_brackets_valid(jsonb), public.staff_pin_ok(uuid, text), public.payroll_can_see(uuid),
  public.staff_clock(uuid, text, text), public.desk_clock_status(),
  public.time_entry_save(uuid, jsonb), public.time_entry_delete(uuid),
  public.payroll_require(), public.employment_save(uuid, jsonb), public.payroll_rate_set(text, jsonb),
  public.vacation_save(uuid, date, numeric, text), public.vacation_delete(uuid),
  public.payroll_income_tax(numeric, jsonb), public.payroll_period_factor(text),
  public.payroll_line_compute(uuid), public.payroll_run_create(date), public.payroll_run_compute(uuid),
  public.payroll_line_update(uuid, jsonb), public.payroll_run_set_status(uuid, text),
  public.payroll_run_delete(uuid), public.payroll_people()
from public, anon;
-- Internal helpers stay closed to sessions too.
revoke execute on function public.staff_pin_ok(uuid, text), public.payroll_line_compute(uuid) from authenticated;
grant execute on function
  public.payroll_brackets_valid(jsonb), public.payroll_can_see(uuid),
  public.staff_clock(uuid, text, text), public.desk_clock_status(),
  public.time_entry_save(uuid, jsonb), public.time_entry_delete(uuid),
  public.payroll_require(), public.employment_save(uuid, jsonb), public.payroll_rate_set(text, jsonb),
  public.vacation_save(uuid, date, numeric, text), public.vacation_delete(uuid),
  public.payroll_income_tax(numeric, jsonb), public.payroll_period_factor(text),
  public.payroll_run_create(date), public.payroll_run_compute(uuid),
  public.payroll_line_update(uuid, jsonb), public.payroll_run_set_status(uuid, text),
  public.payroll_run_delete(uuid), public.payroll_people()
to authenticated;
