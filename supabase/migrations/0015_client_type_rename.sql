-- 0015: retune the client classification to the four options coaches asked
-- for — Personal training, Fisioterapia, Rutinas, Otro.
--
-- 'entrenamiento' becomes 'personal_training' and 'coaching' becomes
-- 'rutinas'; 'fisioterapia' and 'otro' keep their values. Idempotent: the
-- CHECK is widened before the data moves and narrowed after, so the
-- migration is safe to re-run and never rejects rows mid-flight.

-- 1. Drop the old CHECK so both vocabularies are briefly legal.
alter table public.profiles
  drop constraint if exists profiles_client_type_check;

-- 2. Move the default off the retired value before rewriting the rows.
alter table public.profiles
  alter column client_type set default 'personal_training';

-- 3. Migrate existing rows.
update public.profiles
  set client_type = 'personal_training'
  where client_type = 'entrenamiento';

update public.profiles
  set client_type = 'rutinas'
  where client_type = 'coaching';

-- 4. Anything unexpected (drifted or hand-inserted) lands in 'otro' rather
-- than blocking the constraint below.
update public.profiles
  set client_type = 'otro'
  where client_type not in ('personal_training','fisioterapia','rutinas','otro');

-- 5. Re-narrow the CHECK to the new vocabulary.
alter table public.profiles
  add constraint profiles_client_type_check
  check (client_type in ('personal_training','fisioterapia','rutinas','otro'));
