-- CalClick Phase 5 Polish: 닉네임 중복 방지 + 변경 이력 (1일 1회 제한용)
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

alter table profiles
  add column if not exists nickname_changed_at timestamptz;

create unique index if not exists profiles_nickname_unique
  on profiles (lower(nickname))
  where nickname is not null;
