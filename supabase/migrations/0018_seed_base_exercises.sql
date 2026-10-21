-- 0018_seed_base_exercises.sql
-- Seeds the shared base exercise library (migration 0017) with the 38
-- exercises curated in the original Sport Lab project.
--
-- Depends on 0017_base_exercise_library.sql (source, slug,
-- exercises_system_slug_key).
--
-- Idempotent: slug is the identity, not the uuid — fit-crm mints its own ids
-- and never reuses Sport Lab's. Re-running the file updates the name,
-- category and video of an existing slug instead of inserting a duplicate,
-- so this is also the place to correct a bad link later.
--
-- Two values were normalised on the way in, because the base library ships to
-- every coach and its category names are user-visible Spanish:
--   'Back' -> 'Espalda' (2 rows; the rest of the library was already Spanish)
--   Plantiflexiones Mancuerna had no category -> 'Piernas'
--
-- is_explainer is deliberately false for every row. The flag drives the
-- client-facing explainer list, which policy "client reads coach explainers"
-- scopes to a client's OWN coach (me.coach_id = exercises.coach_id) — always
-- NULL, never true, for a system row. A coach who wants a base exercise shown
-- to clients as an explainer copies it into their own library.

insert into public.exercises
  (coach_id, source, slug, name, category, youtube_url, is_explainer)
select null, 'system', v.slug, v.name, v.category, v.youtube_url, false
from (values
  ('abductores-en-maquina', 'Abductores en maquina', 'Piernas', 'https://www.youtube.com/embed/xlp6FYwBFLU'),
  ('aductores-maquina', 'Aductores Maquina', 'Piernas', 'https://www.youtube.com/embed/vlViIgtkvh4'),
  ('bench-press-barra', 'Bench press (Barra)', 'Pecho', 'https://www.youtube.com/embed/hWbUlkb5Ms4'),
  ('bench-press-mancuerna', 'Bench Press (Mancuerna)', 'Pecho', 'https://www.youtube.com/embed/mTaiQemkEpU'),
  ('cobra-stretch', 'Cobra Stretch', 'Movilidad', 'https://www.youtube.com/embed/NP4PrPHpQIE'),
  ('curl-femoral', 'Curl Femoral', 'Piernas', 'https://www.youtube.com/embed/lGNeJsdqJwg'),
  ('curtsy-lunge', 'Curtsy lunge', 'Piernas', 'https://www.youtube.com/embed/NCzebKJUN8c'),
  ('db-static-march', 'Db static march', 'Core', 'https://www.youtube.com/embed/BBaKT_djMqo'),
  ('deep-squat-hold', 'Deep Squat Hold', 'Piernas', 'https://www.youtube.com/embed/LPa3LKlQ7eU'),
  ('desplantes-smith', 'Desplantes Smith', 'Piernas', 'https://www.youtube.com/embed/ngxMg0nuPyY'),
  ('dip-bench', 'Dip (Bench)', 'Triceps', 'https://www.youtube.com/embed/4ua3MzaU0QU'),
  ('dips-paralelas', 'Dips (Paralelas)', 'Pecho', 'https://www.youtube.com/embed/LbsqDJe4EFc'),
  ('dual-dumbbell-hollow-flutter-kicks', 'Dual Dumbbell Hollow Flutter Kicks', 'Movilidad', 'https://www.youtube.com/embed/41m9-rDOgvw'),
  ('dumbbell-static-lunges-desplantes-estatico', 'Dumbbell Static Lunges (desplantes estatico)', 'Piernas', 'https://www.youtube.com/embed/mJilHWIBWO8'),
  ('goblet-squat', 'Goblet Squat', 'Piernas', 'https://www.youtube.com/embed/7-80HiXX1K8'),
  ('incline-bench-press-barra', 'Incline Bench Press (barra)', 'Pecho', 'https://www.youtube.com/embed/98HWfiRonkE'),
  ('incline-bench-press-mancuerna', 'Incline Bench Press (mancuerna)', 'Pecho', 'https://www.youtube.com/embed/8fXfwG4ftaQ'),
  ('jalon-al-pecho-abierto', 'Jalon al pecho (abierto)', 'Espalda', 'https://www.youtube.com/embed/-MS6Z88wv5I'),
  ('jalon-al-pecho-neutro', 'Jalon al pecho (neutro)', 'Espalda', 'https://www.youtube.com/embed/O0SdzxCyFa0'),
  ('knee-push-up', 'Knee Push Up', 'Triceps', 'https://www.youtube.com/embed/jWxvty2KROs'),
  ('leg-extension', 'Leg Extension', 'Piernas', 'https://www.youtube.com/embed/iQ92TuvBqRo'),
  ('leg-press', 'Leg Press', 'Piernas', 'https://www.youtube.com/embed/EotSw18oR9w'),
  ('low-plank', 'Low Plank', 'Core', 'https://www.youtube.com/embed/O83fmDwTYpg'),
  ('mini-band-side-plank-clamshell', 'Mini band side plank clamshell', 'Piernas', 'https://www.youtube.com/embed/a1xnrwNkMkA'),
  ('negative-flag', 'Negative flag', 'Core', 'https://www.youtube.com/embed/L39g-6Vnpr0'),
  ('pec-deck', 'Pec Deck', 'Pecho', 'https://www.youtube.com/embed/a9vQ_hwIksU'),
  ('peso-muerto-rumano', 'Peso Muerto Rumano', 'Piernas', 'https://www.youtube.com/embed/3u9M3nh0C0g'),
  ('plantiflexiones-mancuerna', 'Plantiflexiones Mancuerna', 'Piernas', 'https://www.youtube.com/embed/v1kFDPqC_qA'),
  ('pseudo-planche-push-up', 'Pseudo Planche push up', 'Triceps', 'https://www.youtube.com/embed/C90o5ImqzJ0'),
  ('sentadilla-barra', 'Sentadilla (Barra)', 'Piernas', 'https://www.youtube.com/embed/dsCuiccYNGs'),
  ('sentadilla-smith', 'Sentadilla Smith', 'Piernas', 'https://www.youtube.com/embed/iKCJCydYYrE'),
  ('shoulder-taps', 'Shoulder Taps', 'Core', 'https://www.youtube.com/embed/VfwCQ14soUo'),
  ('side-plank', 'Side plank', 'Core', 'https://www.youtube.com/embed/44ND4bOB-T0'),
  ('single-arm-dumbbell-row', 'Single Arm Dumbbell Row', 'Espalda', 'https://www.youtube.com/embed/ZRSGpBUVcNw'),
  ('single-leg-feet-elevated-hip-thrust', 'Single leg feet elevated hip thrust', 'Piernas', 'https://www.youtube.com/embed/_HFLNmJmC2U'),
  ('single-leg-glute-bridge', 'Single Leg Glute Bridge', 'Piernas', 'https://www.youtube.com/embed/qB_bC7-CQjI'),
  ('weighted-dip', 'Weighted Dip', 'Triceps', 'https://www.youtube.com/embed/ZDOrGNvRdM0'),
  ('weighted-pull-up', 'Weighted Pull Up', 'Espalda', 'https://www.youtube.com/embed/chJcUHfhlHc')
) as v (slug, name, category, youtube_url)
on conflict (slug) where source = 'system'
do update set
  name        = excluded.name,
  category    = excluded.category,
  youtube_url = excluded.youtube_url;
