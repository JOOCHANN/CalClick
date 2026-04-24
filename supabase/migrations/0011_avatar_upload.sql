-- CalClick v0.2-a Polish: 아바타 사진 업로드 + RPC 갱신
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

-- ─────────────────────────────────────────────────────────
-- profiles.avatar_url
-- ─────────────────────────────────────────────────────────
alter table profiles
  add column if not exists avatar_url text;

-- ─────────────────────────────────────────────────────────
-- avatars 스토리지 버킷 (public 읽기 — 공개 프로필에서 익명 접근 필요)
-- 경로 구조: avatars/<user_id>/<uuid>.<ext>
-- ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars own upload" on storage.objects;
create policy "avatars own upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────
-- RPC 갱신 — avatar_url 필드 포함
-- ─────────────────────────────────────────────────────────
drop function if exists public.public_profile(text);
create or replace function public.public_profile(p_nickname text)
returns table (
  id uuid,
  nickname text,
  avatar_emoji text,
  avatar_url text,
  bio text
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.nickname, p.avatar_emoji, p.avatar_url, p.bio
  from profiles p
  where p.nickname is not null
    and lower(btrim(p.nickname)) = lower(btrim(p_nickname))
  limit 1;
$$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;

drop function if exists public.public_followers(uuid, uuid, timestamptz, int);
create or replace function public.public_followers(
  p_user_id uuid,
  p_viewer_id uuid,
  p_cursor timestamptz,
  p_limit int
)
returns table (
  id uuid,
  nickname text,
  avatar_emoji text,
  avatar_url text,
  followed_at timestamptz,
  viewer_is_following boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.nickname,
    p.avatar_emoji,
    p.avatar_url,
    f.created_at as followed_at,
    exists (
      select 1 from follows v
      where v.follower_id = p_viewer_id
        and v.followee_id = p.id
    ) as viewer_is_following
  from follows f
  join profiles p on p.id = f.follower_id
  where f.followee_id = p_user_id
    and p.nickname is not null
    and (p_cursor is null or f.created_at < p_cursor)
  order by f.created_at desc
  limit least(coalesce(p_limit, 20), 50);
$$;
revoke all on function public.public_followers(uuid, uuid, timestamptz, int) from public;
grant execute on function public.public_followers(uuid, uuid, timestamptz, int) to anon, authenticated;

drop function if exists public.public_following(uuid, uuid, timestamptz, int);
create or replace function public.public_following(
  p_user_id uuid,
  p_viewer_id uuid,
  p_cursor timestamptz,
  p_limit int
)
returns table (
  id uuid,
  nickname text,
  avatar_emoji text,
  avatar_url text,
  followed_at timestamptz,
  viewer_is_following boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    p.nickname,
    p.avatar_emoji,
    p.avatar_url,
    f.created_at as followed_at,
    exists (
      select 1 from follows v
      where v.follower_id = p_viewer_id
        and v.followee_id = p.id
    ) as viewer_is_following
  from follows f
  join profiles p on p.id = f.followee_id
  where f.follower_id = p_user_id
    and p.nickname is not null
    and (p_cursor is null or f.created_at < p_cursor)
  order by f.created_at desc
  limit least(coalesce(p_limit, 20), 50);
$$;
revoke all on function public.public_following(uuid, uuid, timestamptz, int) from public;
grant execute on function public.public_following(uuid, uuid, timestamptz, int) to anon, authenticated;
