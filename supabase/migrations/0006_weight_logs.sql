-- CalClick Phase 5 Step 1: weight_logs 테이블 + RLS
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

create table if not exists weight_logs (
  user_id uuid not null references auth.users on delete cascade,
  logged_on date not null,
  weight_kg numeric not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, logged_on)
);

create index if not exists weight_logs_user_date_idx
  on weight_logs (user_id, logged_on desc);

alter table weight_logs enable row level security;

drop policy if exists "own weight" on weight_logs;
create policy "own weight" on weight_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
