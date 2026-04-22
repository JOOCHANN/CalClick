-- CalClick Phase 5 Step 1: profiles 에 신체정보·목표 컬럼 추가
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

alter table profiles
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists birth_year int check (birth_year between 1900 and 2100),
  add column if not exists height_cm numeric check (height_cm between 50 and 250),
  add column if not exists current_weight_kg numeric check (current_weight_kg between 20 and 400),
  add column if not exists activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  add column if not exists goal_kcal int check (goal_kcal between 800 and 6000),
  add column if not exists goal_type text check (goal_type in ('cut', 'maintain', 'bulk')),
  add column if not exists goal_auto boolean not null default true,
  add column if not exists onboarded_at timestamptz;
