-- CalClick v0.2-a Step 2: follows 리스트용 RPC
-- followers/following 목록 조회 시 타인의 닉네임·아바타를 읽어야 하는데
-- profiles는 own-only RLS라 직접 join 불가. SECURITY DEFINER로 공개 필드만 노출.
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

-- ─────────────────────────────────────────────────────────
-- public_followers: p_user_id 를 팔로우하는 사람들
-- cursor = follows.created_at (desc 페이지네이션)
-- viewer_is_following = p_viewer_id 가 이 row의 id 를 팔로우 중인지
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- public_following: p_user_id 가 팔로우하는 사람들
-- ─────────────────────────────────────────────────────────
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
