-- 0011: the intake record — what a coach captures at the first session, and
-- what every follow-up measurement compares against.
-- Run in the Supabase SQL editor (or `supabase db push`). Idempotent.
-- Depends on 0002_roster.sql (roster columns) and 0003_portal_foundation.sql
-- (the measurements table).
--
-- Everything here lands on the client's REAL rows: 0010 creates the account
-- server-side, so the profile id is final from the first second and nothing
-- is staged or re-keyed when the client eventually signs in.
--
-- TWO KINDS OF DATA, TWO PLACES
--   profiles      → what is true about the person (rarely changes):
--                   birth date, gender, height, medical background.
--   measurements  → what was true on a given day (one row per session):
--                   body composition, circumferences, vitals.
-- The split is what makes progress comparable: charting is just "select the
-- column, order by measured_at" — no history hidden inside the profile row.
--
-- birth_date, not age: age is derived at render time so it never goes stale.
-- Database identifiers and enum-ish values are English; the UI is Spanish.

-- 1. Profile-level intake --------------------------------------------------
alter table public.profiles
  add column if not exists birth_date    date,
  add column if not exists gender        text,
  -- Height lives here, not on each measurement: it is stable for adults and
  -- BMI/BMR need it on every reading. Store it once, derive the rest.
  add column if not exists height_cm     numeric(5,1),
  -- Injuries, conditions, medication, surgeries — the PAR-Q style notes a
  -- coach must not lose. Especially relevant with client_type
  -- 'fisioterapia' (0007).
  add column if not exists medical_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_check') then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('female','male','other','unspecified'));
  end if;

  -- A future birth date, or one implying an age over 120, is a typo. Cheap
  -- to catch here, very annoying to find later inside a progress chart.
  if not exists (select 1 from pg_constraint where conname = 'profiles_birth_date_check') then
    alter table public.profiles
      add constraint profiles_birth_date_check
      check (
        birth_date is null
        or (birth_date <= current_date and birth_date > current_date - interval '120 years')
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_height_cm_check') then
    alter table public.profiles
      add constraint profiles_height_cm_check
      check (height_cm is null or (height_cm >= 50 and height_cm <= 260));
  end if;
end $$;

comment on column public.profiles.height_cm is
  'Stable input for BMI/BMR. Derived at render time (see src/lib/body-metrics.ts) rather than stored per measurement.';

-- 2. Measurement-level: the InBody readout ---------------------------------
-- Modelled on what an InBody 270/570/770 actually prints, keeping the fields
-- a coach reviews session over session and dropping the raw impedance dump.
-- Everything is nullable: a coach with only a bathroom scale fills in weight
-- and body fat %, a full InBody session fills in the rest, and both are
-- valid rows in the same table.
--
-- Already present from 0003: weight (kg), fat_pct (InBody's PBF),
-- muscle_pct (percentage-style scales), measured_at, visit_id.
alter table public.measurements
  -- Core composition, in kilograms — this is how an InBody reports muscle,
  -- which is why a kg column is added alongside the existing muscle_pct.
  add column if not exists skeletal_muscle_mass_kg numeric(6,2),  -- SMM
  add column if not exists body_fat_mass_kg        numeric(6,2),  -- BFM
  add column if not exists lean_body_mass_kg       numeric(6,2),  -- FFM
  add column if not exists total_body_water_l      numeric(6,2),  -- TBW
  add column if not exists protein_kg              numeric(6,2),
  add column if not exists mineral_kg              numeric(6,2),
  -- Headline numbers a coach quotes back to the client.
  add column if not exists visceral_fat_level      numeric(4,1),  -- 570/770
  add column if not exists bmr_kcal                integer,
  add column if not exists inbody_score            integer,

  -- Segmental lean mass (kg). The five-segment barplot — this is what shows
  -- left/right imbalance and whether an injured limb is catching up.
  add column if not exists lean_arm_right_kg       numeric(5,2),
  add column if not exists lean_arm_left_kg        numeric(5,2),
  add column if not exists lean_trunk_kg           numeric(5,2),
  add column if not exists lean_leg_right_kg       numeric(5,2),
  add column if not exists lean_leg_left_kg        numeric(5,2),

  -- Tape measurements (cm). Independent of any machine, and the numbers
  -- clients feel first — waist especially.
  add column if not exists neck_cm                 numeric(5,1),
  add column if not exists chest_cm                numeric(5,1),
  add column if not exists waist_cm                numeric(5,1),
  add column if not exists hip_cm                  numeric(5,1),
  add column if not exists arm_right_cm            numeric(5,1),
  add column if not exists arm_left_cm             numeric(5,1),
  add column if not exists thigh_right_cm          numeric(5,1),
  add column if not exists thigh_left_cm           numeric(5,1),
  add column if not exists calf_cm                 numeric(5,1),

  -- Vitals worth trending, cheap to take at the same session.
  add column if not exists resting_heart_rate      integer,
  add column if not exists blood_pressure_systolic  integer,
  add column if not exists blood_pressure_diastolic integer,

  -- Provenance: an InBody reading and a bathroom-scale reading are not
  -- comparable, and a chart that mixes them silently lies.
  add column if not exists source                  text not null default 'manual',
  add column if not exists device_model            text,
  add column if not exists notes                   text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'measurements_source_check') then
    alter table public.measurements
      add constraint measurements_source_check
      check (source in ('inbody','scale','tape','manual'));
  end if;

  -- Percentages are percentages. Guards against a fat_pct of 235 quietly
  -- wrecking every chart the client sees.
  if not exists (select 1 from pg_constraint where conname = 'measurements_pct_check') then
    alter table public.measurements
      add constraint measurements_pct_check
      check (
        (fat_pct    is null or (fat_pct    >= 0 and fat_pct    <= 100))
        and
        (muscle_pct is null or (muscle_pct >= 0 and muscle_pct <= 100))
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'measurements_weight_check') then
    alter table public.measurements
      add constraint measurements_weight_check
      check (weight is null or (weight > 0 and weight <= 500));
  end if;
end $$;

comment on column public.measurements.source is
  'How the reading was taken. Charts must not mix inbody and scale readings on one series.';

-- Initial measurements need no table of their own: the intake reading is an
-- ordinary measurements row with visit_id null, written by the same server
-- action that creates the client. The RLS from 0003 already lets the coach
-- write it and lets the client read their own, so it appears in the client's
-- portal on first login with no policy change.
