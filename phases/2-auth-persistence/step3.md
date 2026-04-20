# Step 3 — foods seed (Phase 1 하드코딩 → DB)

## 목표
Phase 1 `kcal-temp.ts`의 음식 데이터를 `foods` + `food_aliases`로 이관. 이후 Phase 5~ 식약처 API 연동을 위한 레일 확보.

## 작업
1. `supabase/seeds/foods.sql` — Phase 1 MAP을 SQL `insert`로:
   - `foods(food_id, official_name, kcal_per_100g, source)`:
     ```
     ('mfds_kimchi_jjigae', '김치찌개', 62, 'mfds'), ...
     ```
   - `food_aliases(alias, food_id)`:
     ```
     ('김치찌개', 'mfds_kimchi_jjigae'),
     ('kimchi jjigae', 'mfds_kimchi_jjigae'), ...
     ```
2. SQL Editor에서 실행.
3. `src/lib/kcal-temp.ts` 삭제. `// TEMP_PHASE_1` 주석 제거.
4. `src/services/foods.ts` — `findFoodByAlias(name): Promise<{ food_id, kcal_per_100g } | null>`. Supabase `food_aliases` join.
5. Vitest: alias 매칭 정상/없음/대소문자 차이 3 케이스.

## Acceptance Criteria
- `select count(*) from foods` ≥ 10.
- 각 foods row에 alias 최소 1개.
- `kcal-temp.ts` 파일 부재 확인.
- vitest 통과.

## 금지
- 농진청/식약처 실 API 연동 (Phase 5 이후).
- foods 테이블에 중복 food_id.
