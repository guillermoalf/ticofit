-- 0027: exercise library fields, staff exercises with their own video, favorites,
-- and routines owned by the client file (phase 4).
-- Run in the Supabase SQL editor after supabase/dry-runs/0027_dry_run.sql passes.
-- Additive only. Idempotent. Depends on 0023–0025.
--
-- DESIGN (PROGRESS.md A8, design/internal/exercise-library-research.md)
--   * Library: the existing public.exercises table gains muscle groups,
--     equipment, level and Spanish instructions. Staff add exercises as
--     source = 'staff' with a YouTube link or an uploaded video. The 38 system
--     exercises are tagged from their names.
--   * Routines: new tables keyed on public.clients (the legacy routines table is
--     keyed on a coach's profile). A routine is saved whole, atomically, by
--     routine_save(); templates are routines with no client.
--   * A client sees only their current routine: the newest one assigned to them.

-- 1. Library fields ------------------------------------------------------------------
alter table public.exercises add column if not exists muscle_groups text[] not null default '{}';
alter table public.exercises add column if not exists equipment text;
alter table public.exercises add column if not exists level text;
alter table public.exercises add column if not exists instructions text;
alter table public.exercises add column if not exists video_path text;
alter table public.exercises add column if not exists archived boolean not null default false;
alter table public.exercises add column if not exists updated_at timestamptz not null default now();
alter table public.exercises add column if not exists created_by_staff uuid references public.staff (id) on delete set null;
alter table public.exercises add column if not exists updated_by_staff uuid references public.staff (id) on delete set null;

alter table public.exercises drop constraint if exists exercises_library_fields_check;
alter table public.exercises add constraint exercises_library_fields_check check (
  muscle_groups <@ array['pecho','espalda','hombros','biceps','triceps','antebrazos','core','gluteos',
                         'cuadriceps','isquiotibiales','aductores','abductores','pantorrillas',
                         'cuerpo_completo','movilidad']::text[]
  and (equipment is null or equipment in ('peso_corporal','mancuerna','barra','maquina','polea','smith',
                                          'kettlebell','banda','banco','otro'))
  and (level is null or level in ('principiante','intermedio','avanzado'))
  and (instructions is null or char_length(instructions) <= 3000)
  and (video_path is null or video_path ~ '^[0-9a-f-]{36}\.(mp4|mov|webm)$')
);

-- Staff rows: no coach, no slug.
alter table public.exercises drop constraint if exists exercises_source_ownership_ck;
alter table public.exercises add constraint exercises_source_ownership_ck check (
  (source = 'coach'  and coach_id is not null and slug is null)
  or (source = 'system' and coach_id is null and slug is not null)
  or (source = 'staff'  and coach_id is null and slug is null)
);

drop trigger if exists stamp_staff_audit on public.exercises;
create trigger stamp_staff_audit before insert or update on public.exercises
  for each row execute function public.stamp_staff_audit();

-- Tag the base library from the exercise names (equipment and muscles only:
-- level and instructions are the coaches' call). Only rows still untagged.
update public.exercises e
set muscle_groups = v.groups::text[], equipment = v.equipment
from (values
  ('abductores-en-maquina',                       '{abductores,gluteos}',              'maquina'),
  ('aductores-maquina',                           '{aductores}',                       'maquina'),
  ('bench-press-barra',                           '{pecho,triceps,hombros}',           'barra'),
  ('bench-press-mancuerna',                       '{pecho,triceps,hombros}',           'mancuerna'),
  ('cobra-stretch',                               '{movilidad,core}',                  'peso_corporal'),
  ('curl-femoral',                                '{isquiotibiales}',                  'maquina'),
  ('curtsy-lunge',                                '{gluteos,cuadriceps}',              'peso_corporal'),
  ('db-static-march',                             '{core}',                            'mancuerna'),
  ('deep-squat-hold',                             '{movilidad,cuadriceps,gluteos}',    'peso_corporal'),
  ('desplantes-smith',                            '{cuadriceps,gluteos}',              'smith'),
  ('dip-bench',                                   '{triceps}',                         'banco'),
  ('dips-paralelas',                              '{pecho,triceps,hombros}',           'peso_corporal'),
  ('dual-dumbbell-hollow-flutter-kicks',          '{core}',                            'mancuerna'),
  ('dumbbell-static-lunges-desplantes-estatico',  '{cuadriceps,gluteos}',              'mancuerna'),
  ('goblet-squat',                                '{cuadriceps,gluteos}',              'mancuerna'),
  ('incline-bench-press-barra',                   '{pecho,hombros,triceps}',           'barra'),
  ('incline-bench-press-mancuerna',               '{pecho,hombros,triceps}',           'mancuerna'),
  ('jalon-al-pecho-abierto',                      '{espalda,biceps}',                  'polea'),
  ('jalon-al-pecho-neutro',                       '{espalda,biceps}',                  'polea'),
  ('knee-push-up',                                '{pecho,triceps}',                   'peso_corporal'),
  ('leg-extension',                               '{cuadriceps}',                      'maquina'),
  ('leg-press',                                   '{cuadriceps,gluteos}',              'maquina'),
  ('low-plank',                                   '{core}',                            'peso_corporal'),
  ('mini-band-side-plank-clamshell',              '{gluteos,abductores,core}',         'banda'),
  ('negative-flag',                               '{core}',                            'peso_corporal'),
  ('pec-deck',                                    '{pecho}',                           'maquina'),
  ('peso-muerto-rumano',                          '{isquiotibiales,gluteos,espalda}',  'barra'),
  ('plantiflexiones-mancuerna',                   '{pantorrillas}',                    'mancuerna'),
  ('pseudo-planche-push-up',                      '{pecho,hombros,triceps}',           'peso_corporal'),
  ('sentadilla-barra',                            '{cuadriceps,gluteos}',              'barra'),
  ('sentadilla-smith',                            '{cuadriceps,gluteos}',              'smith'),
  ('shoulder-taps',                               '{core,hombros}',                    'peso_corporal'),
  ('side-plank',                                  '{core}',                            'peso_corporal'),
  ('single-arm-dumbbell-row',                     '{espalda,biceps}',                  'mancuerna'),
  ('single-leg-feet-elevated-hip-thrust',         '{gluteos,isquiotibiales}',          'peso_corporal'),
  ('single-leg-glute-bridge',                     '{gluteos}',                         'peso_corporal'),
  ('weighted-dip',                                '{triceps,pecho}',                   'otro'),
  ('weighted-pull-up',                            '{espalda,biceps}',                  'otro')
) as v(slug, groups, equipment)
where e.source = 'system' and e.slug = v.slug and e.muscle_groups = '{}';

-- 2. Favorites, per employee -----------------------------------------------------------
create table if not exists public.staff_exercise_favorites (
  staff_id    uuid not null references public.staff (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (staff_id, exercise_id)
);
create index if not exists staff_exercise_favorites_exercise_idx on public.staff_exercise_favorites (exercise_id);

-- 3. Routines ------------------------------------------------------------------------------
create table if not exists public.client_routines (
  id                uuid primary key default gen_random_uuid(),
  -- NULL = template, shared by the staff of sede_id.
  client_id         uuid references public.clients (id) on delete cascade,
  sede_id           text not null references public.sedes (id),
  name              text not null check (char_length(btrim(name)) between 2 and 80),
  notes             text check (char_length(notes) <= 2000),
  valid_from        date,
  valid_weeks       smallint check (valid_weeks between 4 and 6),
  assigned_at       timestamptz,
  assigned_by_staff uuid references public.staff (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by_staff  uuid references public.staff (id) on delete set null,
  updated_by_staff  uuid references public.staff (id) on delete set null,
  constraint client_routines_shape_check check (
    (client_id is null and valid_from is null and valid_weeks is null and assigned_at is null)
    or (client_id is not null and valid_from is not null and valid_weeks is not null and assigned_at is not null)
  )
);
create index if not exists client_routines_client_idx on public.client_routines (client_id, assigned_at desc);
create index if not exists client_routines_templates_idx on public.client_routines (sede_id, name) where client_id is null;

create table if not exists public.client_routine_days (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.client_routines (id) on delete cascade,
  position   smallint not null check (position between 1 and 6),
  title      text not null check (char_length(btrim(title)) between 1 and 60),
  constraint client_routine_days_position_key unique (routine_id, position)
);

create table if not exists public.client_routine_items (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.client_routine_days (id) on delete cascade,
  position     smallint not null check (position between 1 and 40),
  exercise_id  uuid not null references public.exercises (id),
  sets         smallint check (sets between 1 and 20),
  reps         text check (char_length(reps) <= 20),
  rest_seconds smallint check (rest_seconds between 0 and 900),
  load         text check (char_length(load) <= 40),
  notes        text check (char_length(notes) <= 300),
  -- Items of one day that share a number are done back to back.
  superset     smallint check (superset between 1 and 9),
  constraint client_routine_items_position_key unique (day_id, position)
);
create index if not exists client_routine_items_exercise_idx on public.client_routine_items (exercise_id);

-- 4. Helpers -----------------------------------------------------------------------------------
-- The newest routine assigned to this client file: the only one the client sees.
create or replace function public.current_routine_id(p_client_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select r.id from public.client_routines r
  where r.client_id = p_client_id
  order by r.assigned_at desc, r.created_at desc
  limit 1;
$$;

create or replace function public.staff_can_routine(p_permission text, p_routine_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.staff_can(p_permission), false) and exists (
    select 1 from public.client_routines r
    where r.id = p_routine_id
      and (r.client_id is null and r.sede_id in (select public.staff_sede_ids())
           or r.client_id is not null and public.staff_can_client(p_permission, r.client_id))
  );
$$;

-- Is this routine the signed-in client's current one?
create or replace function public.is_own_current_routine(p_routine_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_routine_id is not null and p_routine_id = public.current_routine_id(public.own_client_id());
$$;

-- 5. Save a routine whole -----------------------------------------------------------------------
-- p_routine: {client_id?, sede_id?, name, notes?, valid_from?, valid_weeks?,
--             days: [{title, items: [{exercise_id, sets?, reps?, rest_seconds?, load?, notes?, superset?}]}]}
-- With p_id NULL it creates (assigning it, if it has a client, as their current
-- routine); with p_id it replaces the routine's content in place.
create or replace function public.routine_save(p_id uuid, p_routine jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client  uuid := nullif(p_routine ->> 'client_id', '')::uuid;
  v_sede    text;
  v_id      uuid := p_id;
  v_days    jsonb := coalesce(p_routine -> 'days', '[]'::jsonb);
  v_day     jsonb;
  v_item    jsonb;
  v_day_id  uuid;
  v_i       int := 0;
  v_j       int;
  v_staff   uuid := public.current_staff_id();
begin
  if jsonb_typeof(v_days) <> 'array' then
    raise exception 'BAD_ROUTINE' using errcode = '22023';
  end if;

  if v_id is not null then
    select client_id, sede_id into v_client, v_sede from public.client_routines where id = v_id for update;
    if not found or not public.staff_can_routine('routines.write', v_id) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
  elsif v_client is not null then
    if not public.staff_can_client('routines.write', v_client) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
    select sede_id into v_sede from public.clients where id = v_client;
  else
    v_sede := p_routine ->> 'sede_id';
    if not coalesce(public.staff_can('routines.write'), false)
       or v_sede is null or v_sede not in (select public.staff_sede_ids()) then
      raise exception 'NOT_ALLOWED' using errcode = '42501';
    end if;
  end if;

  -- A client's routine has 2 to 6 days; a template may be shorter while drafted.
  if jsonb_array_length(v_days) > 6 or (v_client is not null and jsonb_array_length(v_days) < 2) then
    raise exception 'DAYS_OUT_OF_RANGE' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.client_routines
      (client_id, sede_id, name, notes, valid_from, valid_weeks, assigned_at, assigned_by_staff,
       created_by_staff, updated_by_staff)
    values (
      v_client, v_sede, btrim(p_routine ->> 'name'), nullif(btrim(p_routine ->> 'notes'), ''),
      case when v_client is null then null else coalesce((p_routine ->> 'valid_from')::date, public.today_cr()) end,
      case when v_client is null then null else coalesce((p_routine ->> 'valid_weeks')::smallint, 4) end,
      -- clock_timestamp: two assignments in one transaction still order.
      case when v_client is null then null else clock_timestamp() end,
      case when v_client is null then null else v_staff end,
      v_staff, v_staff)
    returning id into v_id;
  else
    update public.client_routines set
      name = btrim(p_routine ->> 'name'),
      notes = nullif(btrim(p_routine ->> 'notes'), ''),
      valid_from = case when client_id is null then null else coalesce((p_routine ->> 'valid_from')::date, valid_from) end,
      valid_weeks = case when client_id is null then null else coalesce((p_routine ->> 'valid_weeks')::smallint, valid_weeks) end,
      updated_at = now(), updated_by_staff = v_staff
    where id = v_id;
    delete from public.client_routine_days where routine_id = v_id;
  end if;

  for v_day in select * from jsonb_array_elements(v_days) loop
    v_i := v_i + 1;
    insert into public.client_routine_days (routine_id, position, title)
    values (v_id, v_i, coalesce(nullif(btrim(v_day ->> 'title'), ''), 'Día ' || v_i))
    returning id into v_day_id;
    v_j := 0;
    for v_item in select * from jsonb_array_elements(coalesce(v_day -> 'items', '[]'::jsonb)) loop
      v_j := v_j + 1;
      -- Only exercises staff can see: the shared library, not archived.
      if not exists (select 1 from public.exercises x where x.id = (v_item ->> 'exercise_id')::uuid
                     and x.source in ('system', 'staff') and not x.archived) then
        raise exception 'EXERCISE_NOT_AVAILABLE' using errcode = '22023';
      end if;
      insert into public.client_routine_items
        (day_id, position, exercise_id, sets, reps, rest_seconds, load, notes, superset)
      values (
        v_day_id, v_j, (v_item ->> 'exercise_id')::uuid,
        nullif(v_item ->> 'sets', '')::smallint,
        nullif(btrim(v_item ->> 'reps'), ''),
        nullif(v_item ->> 'rest_seconds', '')::smallint,
        nullif(btrim(v_item ->> 'load'), ''),
        nullif(btrim(v_item ->> 'notes'), ''),
        nullif(v_item ->> 'superset', '')::smallint);
    end loop;
  end loop;

  return v_id;
end;
$$;

drop trigger if exists stamp_staff_audit on public.client_routines;
create trigger stamp_staff_audit before insert or update on public.client_routines
  for each row execute function public.stamp_staff_audit();

-- Only templates are deleted; a client's routines stay as their history.
create or replace function public.routine_template_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.client_routines where id = p_id and client_id is null)
     or not public.staff_can_routine('routines.write', p_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  delete from public.client_routines where id = p_id;
end;
$$;

-- 6. Exercise videos: public bucket, written only through signed upload URLs -------------------
-- Public so the QR codes printed on a routine keep working; the files are
-- movement demos, not client data. No storage policies: uploads come from
-- signed URLs made by the server after a permission check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-videos', 'exercise-videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- 7. RLS -----------------------------------------------------------------------------------------
alter table public.staff_exercise_favorites enable row level security;
alter table public.client_routines          enable row level security;
alter table public.client_routine_days      enable row level security;
alter table public.client_routine_items     enable row level security;

drop policy if exists "staff reads library" on public.exercises;
create policy "staff reads library" on public.exercises for select to authenticated
  using (source in ('system', 'staff') and (select public.current_staff_id()) is not null);
drop policy if exists "staff adds exercises" on public.exercises;
create policy "staff adds exercises" on public.exercises for insert to authenticated
  with check (source = 'staff' and coach_id is null and slug is null and (select public.staff_can('exercises.write')));
drop policy if exists "staff edits staff exercises" on public.exercises;
create policy "staff edits staff exercises" on public.exercises for update to authenticated
  using (source = 'staff' and (select public.staff_can('exercises.write')))
  with check (source = 'staff' and coach_id is null and slug is null and (select public.staff_can('exercises.write')));
drop policy if exists "client reads exercises of current routine" on public.exercises;
create policy "client reads exercises of current routine" on public.exercises for select to authenticated
  using (exists (
    select 1 from public.client_routine_items i
    join public.client_routine_days d on d.id = i.day_id
    where i.exercise_id = exercises.id and public.is_own_current_routine(d.routine_id)
  ));

drop policy if exists "staff manages own favorites" on public.staff_exercise_favorites;
create policy "staff manages own favorites" on public.staff_exercise_favorites for all to authenticated
  using (staff_id = (select public.current_staff_id()))
  with check (staff_id = (select public.current_staff_id()));

drop policy if exists "staff or client reads routine" on public.client_routines;
create policy "staff or client reads routine" on public.client_routines for select to authenticated
  using (public.is_own_current_routine(id) or public.staff_can_routine('clients.read', id)
         or public.staff_can_routine('routines.write', id));
drop policy if exists "staff or client reads days" on public.client_routine_days;
create policy "staff or client reads days" on public.client_routine_days for select to authenticated
  using (public.is_own_current_routine(routine_id) or public.staff_can_routine('clients.read', routine_id)
         or public.staff_can_routine('routines.write', routine_id));
drop policy if exists "staff or client reads items" on public.client_routine_items;
create policy "staff or client reads items" on public.client_routine_items for select to authenticated
  using (exists (
    select 1 from public.client_routine_days d
    where d.id = client_routine_items.day_id
      and (public.is_own_current_routine(d.routine_id) or public.staff_can_routine('clients.read', d.routine_id)
           or public.staff_can_routine('routines.write', d.routine_id))
  ));

-- 8. Grants ---------------------------------------------------------------------------------------
-- exercises keeps its 0005 grants for the legacy coach screens; RLS decides.
revoke all on public.staff_exercise_favorites, public.client_routines, public.client_routine_days,
  public.client_routine_items from public, anon, authenticated;
grant select, insert, delete on public.staff_exercise_favorites to authenticated;
grant select on public.client_routines, public.client_routine_days, public.client_routine_items to authenticated;
grant all on public.staff_exercise_favorites, public.client_routines, public.client_routine_days,
  public.client_routine_items to service_role;

revoke execute on function public.current_routine_id(uuid), public.staff_can_routine(text, uuid),
  public.is_own_current_routine(uuid), public.routine_save(uuid, jsonb),
  public.routine_template_delete(uuid) from public, anon;
grant execute on function public.current_routine_id(uuid), public.staff_can_routine(text, uuid),
  public.is_own_current_routine(uuid), public.routine_save(uuid, jsonb),
  public.routine_template_delete(uuid) to authenticated, service_role;
