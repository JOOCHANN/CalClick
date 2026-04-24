-- CalClick v0.2-a Step 1: Social foundation (profiles 확장 + follows)
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

-- ─────────────────────────────────────────────────────────
-- profiles: avatar_emoji (프리셋 6개) + bio
-- ─────────────────────────────────────────────────────────
alter table profiles
  add column if not exists avatar_emoji text
    check (avatar_emoji in ('🍚','🍜','🥗','🍳','🍎','🍱'))
    default '🍚',
  add column if not exists bio text
    check (bio is null or char_length(bio) <= 80);

-- ─────────────────────────────────────────────────────────
-- follows: (follower_id, followee_id) 복합 PK
-- ─────────────────────────────────────────────────────────
create table if not exists follows (
  follower_id uuid not null references auth.users on delete cascade,
  followee_id uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on follows(followee_id);
create index if not exists follows_follower_idx on follows(follower_id);

alter table follows enable row level security;

drop policy if exists "follows read"   on follows;
drop policy if exists "follow self"    on follows;
drop policy if exists "unfollow self"  on follows;

create policy "follows read" on follows
  for select using (true);

create policy "follow self" on follows
  for insert with check (follower_id = auth.uid());

create policy "unfollow self" on follows
  for delete using (follower_id = auth.uid());

-- ─────────────────────────────────────────────────────────
-- 공개 프로필 RPC (민감 컬럼 차단)
-- profiles 본 테이블 RLS는 "own profile"로 유지 — 본인만 select 가능.
-- 외부 공개는 아래 SECURITY DEFINER 함수로만.
-- ─────────────────────────────────────────────────────────
create or replace function public.public_profile(p_nickname text)
returns table (
  id uuid,
  nickname text,
  avatar_emoji text,
  bio text
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.nickname, p.avatar_emoji, p.bio
  from profiles p
  where p.nickname is not null
    and lower(p.nickname) = lower(p_nickname)
  limit 1;
$$;

revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 공개 통계 RPC — 타인이 볼 수 있는 집계 (숫자만, 식단 내용 비공개)
-- 총 기록일 = distinct date(eaten_at)
-- 현재 스트릭 = 오늘부터 연속으로 기록된 일수
-- 팔로워/팔로잉 수
-- ─────────────────────────────────────────────────────────
create or replace function public.public_stats(p_user_id uuid)
returns table (
  total_days int,
  current_streak int,
  followers_count int,
  following_count int
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_total int;
  v_streak int := 0;
  v_followers int;
  v_following int;
  v_cursor date := (now() at time zone 'Asia/Seoul')::date;
  v_has_day boolean;
begin
  select count(distinct (eaten_at at time zone 'Asia/Seoul')::date)
    into v_total
    from meals where user_id = p_user_id;

  -- 오늘부터 거꾸로 하루씩, 기록 있으면 +1, 없으면 중단
  loop
    select exists (
      select 1 from meals
      where user_id = p_user_id
        and (eaten_at at time zone 'Asia/Seoul')::date = v_cursor
    ) into v_has_day;
    exit when not v_has_day;
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
    exit when v_streak > 3650; -- safety
  end loop;

  select count(*) into v_followers from follows where followee_id = p_user_id;
  select count(*) into v_following from follows where follower_id = p_user_id;

  total_days       := coalesce(v_total, 0);
  current_streak   := v_streak;
  followers_count  := coalesce(v_followers, 0);
  following_count  := coalesce(v_following, 0);
  return next;
end;
$$;

revoke all on function public.public_stats(uuid) from public;
grant execute on function public.public_stats(uuid) to anon, authenticated;
