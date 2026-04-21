-- CalClick Phase 4 Step 1: meal-photos Storage 버킷 + RLS
-- 적용: Supabase Dashboard → SQL Editor에 전체 붙여넣고 Run.
--
-- 버킷 구조: meal-photos/<user_id>/<uuid>.webp
-- 폴더 첫 세그먼트(user_id)로 사용자 격리.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  5242880, -- 5MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 본인 폴더에만 upload / read / delete 허용
drop policy if exists "meal-photos own upload" on storage.objects;
create policy "meal-photos own upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal-photos own read" on storage.objects;
create policy "meal-photos own read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "meal-photos own delete" on storage.objects;
create policy "meal-photos own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
