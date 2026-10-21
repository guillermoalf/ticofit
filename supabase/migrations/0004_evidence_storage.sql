-- Fase A: private `evidence` storage bucket for progress photos.
-- Run in the Supabase SQL editor AFTER 0003_portal_foundation.sql.
-- Idempotent so it's safe to re-run.
--
-- Path convention (enforced by the policies below):
--   evidence/<client_id>/<filename>
-- The first folder segment is the owning client's profile id.
--
-- Access model:
--   * Coach: upload/read/update/delete objects for clients they own.
--   * Client: read-only on objects inside their own folder.
--   * Bucket is private — everything else is denied; the app serves photos
--     via signed URLs.

-- 1. Bucket ------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do update set public = false;

-- 2. Policies on storage.objects ---------------------------------------------
-- is_own_client() comes from 0003 (security definer, checks profiles.coach_id).

drop policy if exists "coach uploads client evidence" on storage.objects;
create policy "coach uploads client evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and public.is_own_client(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "coach reads client evidence" on storage.objects;
create policy "coach reads client evidence"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and public.is_own_client(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "coach updates client evidence" on storage.objects;
create policy "coach updates client evidence"
  on storage.objects for update
  using (
    bucket_id = 'evidence'
    and public.is_own_client(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'evidence'
    and public.is_own_client(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "coach deletes client evidence" on storage.objects;
create policy "coach deletes client evidence"
  on storage.objects for delete
  using (
    bucket_id = 'evidence'
    and public.is_own_client(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "client reads own evidence photos" on storage.objects;
create policy "client reads own evidence photos"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
