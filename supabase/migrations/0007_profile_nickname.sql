-- CalClick Phase 5 Polish: profiles.nickname
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

alter table profiles
  add column if not exists nickname text check (char_length(nickname) between 1 and 20);
