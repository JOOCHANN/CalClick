-- CalClick Phase 2 Step 1: 초기 스키마 + RLS
-- 적용: Supabase Dashboard → SQL Editor에 전체 붙여넣고 Run.

-- ─────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  privacy_accepted_at timestamptz
);

-- ─────────────────────────────────────────────────────────
-- foods + aliases (공용 read-only)
-- food_id는 source prefix (mfds_*, rda_*)로 충돌 방지
-- ─────────────────────────────────────────────────────────
create table if not exists foods (
  food_id text primary key,
  official_name text not null,
  kcal_per_100g numeric not null check (kcal_per_100g >= 0),
  carb_g numeric,
  protein_g numeric,
  fat_g numeric,
  source text not null check (source in ('mfds', 'rda', 'manual'))
);

create table if not exists food_aliases (
  alias text primary key,
  food_id text not null references foods on delete cascade
);

-- ─────────────────────────────────────────────────────────
-- meals + meal_items (사용자 격리)
-- ─────────────────────────────────────────────────────────
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_path text,
  total_kcal numeric not null default 0 check (total_kcal >= 0),
  share_count int not null default 1 check (share_count >= 1),
  note text
);
create index if not exists meals_user_eaten_idx on meals(user_id, eaten_at desc);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals on delete cascade,
  food_id text not null references foods,
  grams numeric not null check (grams > 0),
  kcal numeric not null check (kcal >= 0)
);
create index if not exists meal_items_meal_idx on meal_items(meal_id);

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────
alter table profiles      enable row level security;
alter table meals         enable row level security;
alter table meal_items    enable row level security;
alter table foods         enable row level security;
alter table food_aliases  enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own meals" on meals;
create policy "own meals" on meals
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own meal_items" on meal_items;
create policy "own meal_items" on meal_items
  using (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()));

-- foods / food_aliases는 공용 read-only (anon + authenticated 모두 SELECT 가능)
drop policy if exists "foods read" on foods;
create policy "foods read" on foods for select using (true);

drop policy if exists "aliases read" on food_aliases;
create policy "aliases read" on food_aliases for select using (true);

-- ─────────────────────────────────────────────────────────
-- 가입 시 profiles row 자동 생성 트리거
-- ─────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
