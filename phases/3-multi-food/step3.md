# Step 3 — share-count (÷N)

## 목표
공유 식사 시 인원 수로 나눠 기록. "혼자/같이 2명/3명/4명+" 토글.

## 작업
1. `src/app/page.tsx`:
   - 상태: `shareCount: number` (기본 1), 1~6 범위 토글 버튼
   - 총 kcal preview = (sum of included items) / shareCount (반올림)
2. `/api/meals` POST body에 `shareCount` 포함 (이미 schema에 있음)
3. 서버: 이미 저장하는 `meals.share_count`와 별개로, 개인 기록용 `meal_items.kcal`도 ÷N 반영
   - 선택: 각 item kcal을 ÷N 후 저장
4. UI: 저장 후 토스트 "혼자: +500 kcal" or "2명 공유: +250 kcal"

## Acceptance Criteria
- shareCount=2 저장 시 meals.total_kcal = items 합 / 2 (반올림)
- meals.share_count 컬럼에 값 기록
- 로그인→가입→저장 후 홈 "오늘 섭취"에 ÷N 반영된 값

## 금지
- total_kcal은 나누고 meal_items.kcal은 안 나누는 불일치 (둘 다 ÷N 또는 둘 다 원본)
