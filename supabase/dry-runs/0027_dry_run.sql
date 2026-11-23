-- PRUEBA de la migración 0027 (unos 53 casos). NO es una migración y NO guarda nada.
-- Migración probada: sha256 1337e1b40e3a9c8c5c3859d0714a1a5f18dc5317d86a58a92b8d82092f98ebdc
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

$mig$;
execute $tests$

create function public.dryrun_check(p_name text, p_sql text, p_expected text) returns text
language plpgsql as $c$
declare n integer; got text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    raise exception 'ok:%', n;
  exception when others then got := sqlerrm;
  end;
  if got like p_expected then return null; end if;
  return p_name || ' => ' || got;
end $c$;
grant execute on function public.dryrun_check(text, text, text) to anon, authenticated;
create function public.dryrun_value(p_sql text) returns text language plpgsql as $v$
declare r text; begin execute p_sql into r; return r; end $v$;
grant execute on function public.dryrun_value(text) to anon, authenticated;

do $t$
declare
  desk_id uuid; desk text; u1 uuid := gen_random_uuid(); j1 text;
  c uuid; x uuid; k1 uuid; k2 uuid; kc uuid; e1 uuid; e2 uuid; ecoach uuid; sx uuid;
  r1 uuid; r2 uuid; tpl uuid; f text[] := '{}'; v text; hc text; hx text;
  two_days text; one_day text; seven_days text;
begin
  select id into desk_id from public.profiles where role::text = 'admin' and authorized limit 1;
  desk := json_build_object('sub', desk_id, 'role', 'authenticated')::text;
  j1 := json_build_object('sub', u1, 'role', 'authenticated')::text;

  v := (select count(*)::text from public.exercises where source = 'system' and muscle_groups <> '{}' and equipment is not null);
  if v <> (select count(*)::text from public.exercises where source = 'system') then
    f := f || ('system tagged ' || v)::text;
  end if;

  insert into public.staff (full_name, role_id) values ('DEMO Coach', 'coach') returning id into c;
  insert into public.staff (full_name, role_id) values ('DEMO Cafe', 'coach') returning id into x;
  insert into public.staff_sedes values (c,'bellavista'),(x,'cafe');
  insert into public.staff_sessions (token_hash, staff_id, desk_id, expires_at) values
    (encode(extensions.digest('dry-coach','sha256'),'hex'), c, desk_id, now() + interval '5 minutes'),
    (encode(extensions.digest('dry-cafe','sha256'),'hex'),  x, desk_id, now() + interval '5 minutes');
  hc := '{"x-staff-token":"dry-coach"}'; hx := '{"x-staff-token":"dry-cafe"}';
  insert into public.profiles (id, full_name, role, authorized) values (u1, 'DEMO Cliente', 'client', true);
  insert into public.clients (sede_id, full_name, user_id) values ('bellavista', 'DEMO Uno', u1) returning id into k1;
  insert into public.clients (sede_id, full_name) values ('bellavista', 'DEMO Dos') returning id into k2;
  insert into public.clients (sede_id, full_name) values ('cafe', 'DEMO Cafe') returning id into kc;
  select id into e1 from public.exercises where source = 'system' order by slug limit 1;
  select id into e2 from public.exercises where source = 'system' order by slug offset 1 limit 1;
  select id into ecoach from public.exercises where source = 'coach' limit 1;

  -- coach of bellavista
  perform set_config('request.jwt.claims', desk, true);
  perform set_config('request.headers', hc, true);
  execute 'set local role authenticated';
  f := f || public.dryrun_check('staff reads library', $q$select 1 from public.exercises where source = 'system'$q$, 'ok:%');
  if public.dryrun_value($q$select count(*)::text from public.exercises where source = 'system'$q$) = '0' then f := f || 'staff sees no library'::text; end if;
  insert into public.exercises (name, category, source, muscle_groups, equipment, youtube_url)
    values ('DEMO Remo', 'Espalda', 'staff', '{espalda}', 'polea', 'https://youtu.be/x') returning id into sx;
  if (select created_by_staff from public.exercises where id = sx) is distinct from c then f := f || 'staff exercise not stamped'::text; end if;
  f := f || public.dryrun_check('bad muscle', $q$insert into public.exercises (name, category, source, muscle_groups) values ('DEMO X', 'X', 'staff', '{nalgas}')$q$, '%exercises_library_fields_check%');
  f := f || public.dryrun_check('bad video path', $q$insert into public.exercises (name, category, source, video_path) values ('DEMO X', 'X', 'staff', '../otro.mp4')$q$, '%exercises_library_fields_check%');
  f := f || public.dryrun_check('staff forges system row', $q$insert into public.exercises (name, category, source, slug) values ('DEMO X', 'X', 'system', 'demo-x')$q$, '%row-level security%');
  f := f || public.dryrun_check('staff edits system row', format($q$update public.exercises set name = 'X' where id = %L$q$, e1), 'ok:0');
  f := f || public.dryrun_check('staff archives own row', format($q$update public.exercises set archived = true where id = %L$q$, sx), 'ok:1');
  f := f || public.dryrun_check('favorite', format($q$insert into public.staff_exercise_favorites (staff_id, exercise_id) values (%L, %L)$q$, c, e1), 'ok:1');
  f := f || public.dryrun_check('favorite for someone else', format($q$insert into public.staff_exercise_favorites (staff_id, exercise_id) values (%L, %L)$q$, x, e1), '%row-level security%');

  two_days := format('[{"title":"A","items":[{"exercise_id":"%s","sets":3,"reps":"10-12","rest_seconds":60}]},{"title":"B","items":[{"exercise_id":"%s","sets":4,"reps":"8","superset":1},{"exercise_id":"%s","superset":1}]}]', e1, e2, e1);
  one_day := format('[{"title":"A","items":[{"exercise_id":"%s"}]}]', e1);
  seven_days := (select jsonb_agg(jsonb_build_object('title', 'D' || g, 'items', '[]'::jsonb))::text from generate_series(1, 7) g);

  f := f || public.dryrun_check('client routine with 1 day', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Uno","days":%s}')$q$, k1, one_day), 'DAYS_OUT_OF_RANGE');
  f := f || public.dryrun_check('routine with 7 days', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Siete","days":%s}')$q$, k1, seven_days), 'DAYS_OUT_OF_RANGE');
  f := f || public.dryrun_check('valid weeks 8', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Ocho","valid_weeks":8,"days":%s}')$q$, k1, two_days), '%valid_weeks%');
  f := f || public.dryrun_check('coach exercise in routine', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Coach","days":[{"items":[{"exercise_id":"%s"}]},{"items":[]}]}')$q$, k1, coalesce(ecoach, gen_random_uuid())), 'EXERCISE_NOT_AVAILABLE');
  f := f || public.dryrun_check('archived exercise in routine', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Arch","days":[{"items":[{"exercise_id":"%s"}]},{"items":[]}]}')$q$, k1, sx), 'EXERCISE_NOT_AVAILABLE');
  f := f || public.dryrun_check('routine for other sede', format($q$select public.routine_save(null, '{"client_id":"%s","name":"Cafe","days":%s}')$q$, kc, two_days), 'NOT_ALLOWED');
  f := f || public.dryrun_check('template in other sede', format($q$select public.routine_save(null, '{"sede_id":"cafe","name":"Plantilla","days":%s}')$q$, one_day), 'NOT_ALLOWED');
  r1 := public.routine_save(null, format('{"client_id":"%s","name":"Fuerza","valid_weeks":5,"days":%s}', k1, two_days)::jsonb);
  r2 := public.routine_save(null, format('{"client_id":"%s","name":"Fuerza 2","days":%s}', k1, two_days)::jsonb);
  tpl := public.routine_save(null, format('{"sede_id":"bellavista","name":"Plantilla","days":%s}', one_day)::jsonb);
  v := public.dryrun_value(format($q$select count(*)::text from public.client_routine_items i join public.client_routine_days d on d.id = i.day_id where d.routine_id = %L$q$, r1));
  if v <> '3' then f := f || ('r1 items ' || v)::text; end if;
  v := public.dryrun_value(format($q$select assigned_by_staff::text || valid_weeks from public.client_routines where id = %L$q$, r1));
  if v is distinct from c::text || '5' then f := f || ('r1 audit ' || coalesce(v, 'null'))::text; end if;
  perform public.routine_save(r1, format('{"name":"Fuerza editada","days":%s}', two_days)::jsonb);
  v := public.dryrun_value(format($q$select count(*)::text from public.client_routine_days where routine_id = %L$q$, r1));
  if v <> '2' then f := f || ('r1 days after edit ' || v)::text; end if;
  f := f || public.dryrun_check('direct insert', format($q$insert into public.client_routines (client_id, sede_id, name) values (%L, 'bellavista', 'X')$q$, k1), '%permission denied%');
  f := f || public.dryrun_check('delete client routine', format($q$select public.routine_template_delete(%L)$q$, r1), 'NOT_ALLOWED');

  -- coach of cafe
  perform set_config('request.headers', hx, true);
  f := f || public.dryrun_check('cafe reads bellavista routine', format($q$select 1 from public.client_routines where id = %L$q$, r1), 'ok:0');
  f := f || public.dryrun_check('cafe reads bellavista template', format($q$select 1 from public.client_routines where id = %L$q$, tpl), 'ok:0');
  f := f || public.dryrun_check('cafe edits bellavista routine', format($q$select public.routine_save(%L, '{"name":"X","days":%s}')$q$, r1, two_days), 'NOT_ALLOWED');
  f := f || public.dryrun_check('cafe deletes bellavista template', format($q$select public.routine_template_delete(%L)$q$, tpl), 'NOT_ALLOWED');
  f := f || public.dryrun_check('cafe reads other favorites', $q$select 1 from public.staff_exercise_favorites$q$, 'ok:0');

  -- locked desk
  perform set_config('request.headers', '{}', true);
  f := f || public.dryrun_check('locked reads library', $q$select 1 from public.exercises where source in ('system','staff')$q$, 'ok:0');
  f := f || public.dryrun_check('locked adds exercise', $q$insert into public.exercises (name, category, source) values ('DEMO X', 'X', 'staff')$q$, '%row-level security%');
  f := f || public.dryrun_check('locked saves routine', format($q$select public.routine_save(null, '{"client_id":"%s","name":"X","days":%s}')$q$, k1, two_days), 'NOT_ALLOWED');
  f := f || public.dryrun_check('locked reads routines', $q$select 1 from public.client_routines$q$, 'ok:0');

  -- the client
  perform set_config('request.jwt.claims', j1, true);
  f := f || public.dryrun_check('client sees current routine only', $q$select 1 from public.client_routines$q$, 'ok:1');
  v := public.dryrun_value($q$select id::text from public.client_routines$q$);
  if v is distinct from r2::text then f := f || 'client sees an old routine'::text; end if;
  f := f || public.dryrun_check('client reads days', $q$select 1 from public.client_routine_days$q$, 'ok:2');
  f := f || public.dryrun_check('client reads items', $q$select 1 from public.client_routine_items$q$, 'ok:3');
  f := f || public.dryrun_check('client reads routine exercises', format($q$select 1 from public.exercises where id in (%L, %L)$q$, e1, e2), 'ok:2');
  f := f || public.dryrun_check('client reads other exercises', format($q$select 1 from public.exercises where source = 'system' and id not in (%L, %L)$q$, e1, e2), 'ok:0');
  f := f || public.dryrun_check('client saves routine', format($q$select public.routine_save(%L, '{"name":"Mia","days":%s}')$q$, r2, two_days), 'NOT_ALLOWED');
  f := f || public.dryrun_check('client edits items', $q$update public.client_routine_items set sets = 9$q$, '%permission denied%');
  f := f || public.dryrun_check('client reads templates', format($q$select 1 from public.client_routines where id = %L$q$, tpl), 'ok:0');
  f := f || public.dryrun_check('client adds exercise', $q$insert into public.exercises (name, category, source) values ('DEMO X', 'X', 'staff')$q$, '%row-level security%');
  f := f || public.dryrun_check('client with a stolen token', format($q$select 1 from public.client_routines where client_id = %L$q$, k2), 'ok:0');
  perform set_config('request.headers', hc, true);
  f := f || public.dryrun_check('client + coach token reads library', $q$select 1 from public.exercises where source = 'staff'$q$, 'ok:0');
  perform set_config('request.headers', '{}', true);

  -- anon
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  f := f || public.dryrun_check('anon reads routines', $q$select 1 from public.client_routines$q$, '%permission denied%');
  f := f || public.dryrun_check('anon reads favorites', $q$select 1 from public.staff_exercise_favorites$q$, '%permission denied%');
  f := f || public.dryrun_check('anon reads library', $q$select 1 from public.exercises$q$,
    case when has_table_privilege('anon', 'public.exercises', 'select') then 'ok:0' else '%permission denied%' end);
  f := f || public.dryrun_check('anon saves routine', $q$select public.routine_save(null, '{}')$q$, '%permission denied%');
  execute 'reset role';
  if not exists (select 1 from storage.buckets where id = 'exercise-videos' and public) then f := f || 'no video bucket'::text; end if;

  f := array_remove(f, null);
  if cardinality(f) = 0 then raise exception 'DRYRUN_OK: todas las pruebas de la 0027 pasaron'; end if;
  raise exception 'DRYRUN_FALLAS (%): %', cardinality(f), array_to_string(f, ' | ');
end $t$;

$tests$;
  exception when others then resultado := sqlerrm;
  end;
  raise exception '%', coalesce(resultado, 'DRYRUN_ABORT: sin resultado');
end
$dry$;
