# Step 5 — localStorage 저장 + 오늘 kcal 합계

## 목표
인식 결과를 "저장" → localStorage에 누적 → 홈 상단에 "오늘 섭취 kcal" 숫자 표시.

## 작업
1. `src/lib/storage.ts`:
   ```ts
   type MealEntry = { id: string; eatenAt: string; foods: {name, grams, kcal}[]; totalKcal: number };
   const KEY = "calclick.meals.v1";
   export const listMeals = (): MealEntry[] => ...
   export const addMeal = (m: Omit<MealEntry, "id" | "eatenAt">) => ...
   export const todayTotalKcal = () => ...
   ```
   - 스키마 버전 키 (`.v1`) — Phase 2에서 마이그레이션 시 사용.
   - JSON.parse 실패 시 빈 배열로 fallback.
2. `src/app/page.tsx`:
   - 결과 카드에 "저장" 버튼 추가 → `addMeal()` 호출.
   - 상단 섹션: 오늘 kcal 큰 숫자 (tabular-nums, text-5xl).
   - `useEffect`로 마운트 시 로드, storage 이벤트 구독 (탭 간 동기화).
3. `src/lib/storage.test.ts` — todayTotalKcal 계산 테스트 (mock Date).

## Acceptance Criteria
- 저장 후 페이지 새로고침해도 오늘 kcal 유지.
- 날짜 바뀌면 합계 리셋 (자정 기준 로컬 타임존).
- Vitest 통과.
- `build`/`lint` 통과.

## 금지
- Supabase/서버 저장 (Phase 2).
- 날짜 이동/다이어리 (Phase 4).
