# Step 1 — Supabase Setup + Schema + RLS

## 목표
Supabase 프로젝트 연결, 정규화된 스키마 migration, RLS 정책으로 사용자 격리.

## 작업
1. **Supabase 프로젝트 생성** (사용자 수행):
   - https://supabase.com → New project (region: **Seoul/Tokyo** 권장)
   - URL, `anon` key, `service_role` key 메모
2. `.env.local` + Cloudflare Worker secret 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Worker Secret only, 클라이언트 번들 금지)
3. `npm i @supabase/supabase-js @supabase/ssr`
4. `src/services/supabase.ts` — browser client + server client 래퍼 (`@supabase/ssr`).
5. `supabase/migrations/0001_init.sql`:
   ```sql
   create table profiles (
     id uuid primary key references auth.users on delete cascade,
     created_at timestamptz default now(),
     privacy_accepted_at timestamptz
   );

   create table foods (
     food_id text primary key,
     official_name text not null,
     kcal_per_100g numeric not null,
     carb_g numeric, protein_g numeric, fat_g numeric,
     source text not null
   );

   create table food_aliases (
     alias text primary key,
     food_id text not null references foods on delete cascade
   );

   create table meals (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users on delete cascade,
     eaten_at timestamptz not null default now(),
     meal_type text,
     photo_path text,
     total_kcal numeric not null default 0,
     share_count int not null default 1,
     note text
   );
   create index meals_user_eaten_idx on meals(user_id, eaten_at desc);

   create table meal_items (
     id uuid primary key default gen_random_uuid(),
     meal_id uuid not null references meals on delete cascade,
     food_id text not null references foods,
     grams numeric not null,
     kcal numeric not null
   );

   -- RLS
   alter table profiles enable row level security;
   alter table meals enable row level security;
   alter table meal_items enable row level security;

   create policy "own profile" on profiles
     using (id = auth.uid()) with check (id = auth.uid());
   create policy "own meals" on meals
     using (user_id = auth.uid()) with check (user_id = auth.uid());
   create policy "own meal_items" on meal_items
     using (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()))
     with check (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()));

   -- foods / food_aliases는 공용 read-only
   alter table foods enable row level security;
   alter table food_aliases enable row level security;
   create policy "foods read" on foods for select using (true);
   create policy "aliases read" on food_aliases for select using (true);
   ```
6. Supabase SQL Editor에 붙여넣고 실행 (또는 `supabase db push`).
7. RLS 테스트 (`supabase/tests/rls.test.ts` 또는 수동):
   - 두 유저 토큰 생성 → 서로의 `meals` SELECT/INSERT 거부 확인.

## Acceptance Criteria
- Supabase SQL Editor에서 5개 테이블 + 정책 확인.
- RLS 없는 테이블 0개.
- 클라이언트 번들에 `service_role` 키 미포함 (grep 확인).
- `npm run build` 통과.

## 필요한 사용자 입력
- Supabase 프로젝트 URL, anon key, service_role key.
- Cloudflare Worker에 3개 env 추가 (anon은 Plaintext, service_role은 Secret).

## 금지
- Auth UI (Step 2).
- Phase 1 localStorage 제거 (Step 5).
- 자유문자열로 음식 저장 (반드시 `food_aliases`→`food_id` 경유).
