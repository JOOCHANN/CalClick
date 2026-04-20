# Step 4 — save-to-db (/api/meals POST)

## 목표
Phase 1에서 localStorage에 저장하던 식사를 서버에 저장. LLM 음식명을 `food_aliases`로 정규화.

## 작업
1. `src/app/api/meals/route.ts` — POST:
   - body: `{ candidates: [{ name, grams }], eatenAt?, shareCount? }`
   - 서버 Supabase client (쿠키 세션) 사용.
   - 각 candidate에 대해 `findFoodByAlias(name)`.
     - 매칭 성공 → `food_id` 사용, `kcal = kcal_per_100g * grams / 100`.
     - 매칭 실패 → **저장 거부하고 어떤 음식이 실패했는지 에러 반환**. (자유문자열 저장 금지, 사용자가 재선택 — 또는 Phase 3 이후 UI로 대체 후보 선택.)
   - INSERT `meals` + `meal_items` (트랜잭션).
2. `src/app/page.tsx` 저장 버튼 → localStorage 대신 `POST /api/meals`.
3. 알 수 없는 음식이 있으면 토스트로 "인식되지 않은 음식: X" 노출 후 카드에서 해당 항목 하이라이트.
4. Vitest: POST 계약 (성공 / alias 미매칭 / 인증 없음 3 케이스) — Supabase mock.

## Acceptance Criteria
- 로그인 유저가 저장 → DB에 meals + meal_items row 생성.
- 알 수 없는 음식명 저장 시도 → 400 + 명확한 에러.
- 다른 유저 토큰으로 타 meals INSERT 시도 → RLS에서 거부.

## 금지
- localStorage 제거 (Step 5에서).
- meal_items에 food_id 없이 자유문자열 저장 (CRITICAL).
