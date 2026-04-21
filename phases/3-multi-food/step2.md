# Step 2 — multi-food-ui

## 목표
음식별 카드 그룹으로 UI 재구성. 각 음식 그룹에서 후보 1개 선택, 전체 저장 ON/OFF.

## 작업
1. `src/app/page.tsx`:
   - 상태: `items: EditableItem[]` where `EditableItem = { label?, candidates: EditableCandidate[], selectedIdx: number, included: boolean }`
   - 각 item은 섹션으로 묶이고, 섹션 내 후보 카드는 radio 방식 (현재 구조 재사용)
   - 섹션 헤더에 label(있으면) + 포함/제외 체크박스(기본 ON)
   - 포함된 item들의 선택된 candidate만 저장에 전달
2. 저장 전 검증: 포함된 item 중 `food_id` null인 것 있으면 해당 음식명 리스트를 토스트에 표시 후 중단
3. `/api/meals` POST body: 포함 item들의 선택 candidate를 `candidates: [{name, grams}, ...]`로 전달 (API 계약 무변경)
4. 총 kcal preview: 포함 item × 선택 candidate × grams 합산

## Acceptance Criteria
- 3개 음식 감지된 경우 카드 그룹 3개 표시
- 한 그룹 제외 체크 → 저장 시 2개 item만 meal_items에 row 생김
- DB에 없는 음식 포함된 그룹 저장 시도 → 명확한 에러

## 금지
- 단일 음식 플로우로 회귀 (Step 1 items 포맷 사용)
