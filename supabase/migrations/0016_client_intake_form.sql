-- 0016: the rest of the coach's paper intake sheet.
--
-- 0011 already added birth_date, gender, height_cm and medical_notes but
-- never surfaced them. This completes the sheet so the whole first-session
-- form lives on the profile row, and 0016's UI is the first thing to write
-- to any of it.
--
-- Everything is nullable on purpose: a coach registering a walk-in mid-class
-- must be able to save a name and nothing else, then fill the rest in later.
-- Identifiers are English; the UI is Spanish (see src/types/profile.ts).

alter table public.profiles
  add column if not exists national_id              text,
  add column if not exists address                  text,
  add column if not exists occupation               text,
  add column if not exists blood_type               text,
  add column if not exists emergency_contact_name   text,
  add column if not exists emergency_contact_phone  text,
  -- "Correr, Surfear" — what the client already does, in their words.
  add column if not exists sports_experience        text,
  add column if not exists weekly_frequency_days    smallint,
  add column if not exists session_duration_min     smallint,
  -- The four objective checkboxes. An array, not four booleans: the set is
  -- the answer, and adding a fifth objective later is a label change here
  -- rather than a migration.
  add column if not exists goals                    text[],
  -- Clinical history, split the way the sheet splits it. medical_notes
  -- (0011) carries "antecedentes patológicos".
  add column if not exists medications              text,
  add column if not exists sports_injuries          text,
  add column if not exists excluded_exercises       text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_blood_type_check') then
    alter table public.profiles
      add constraint profiles_blood_type_check
      check (blood_type is null or blood_type in
        ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
  end if;

  -- Days per week: 0 is meaningful (not training yet), 14 covers doubles.
  if not exists (select 1 from pg_constraint where conname = 'profiles_weekly_frequency_check') then
    alter table public.profiles
      add constraint profiles_weekly_frequency_check
      check (weekly_frequency_days is null
             or (weekly_frequency_days >= 0 and weekly_frequency_days <= 14));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_session_duration_check') then
    alter table public.profiles
      add constraint profiles_session_duration_check
      check (session_duration_min is null
             or (session_duration_min >= 5 and session_duration_min <= 600));
  end if;

  -- Keeps the array honest: a typo'd objective would silently never match
  -- a label and render blank in the UI.
  if not exists (select 1 from pg_constraint where conname = 'profiles_goals_check') then
    alter table public.profiles
      add constraint profiles_goals_check
      check (goals is null
             or goals <@ array['muscle_gain','fat_loss','fitness','health']::text[]);
  end if;
end $$;

comment on column public.profiles.goals is
  'Intake objectives checklist. Labels live in CLIENT_GOAL_LABELS (src/types/profile.ts).';
comment on column public.profiles.medical_notes is
  'Antecedentes patologicos. Medications, injuries and unwanted exercises have their own columns.';
