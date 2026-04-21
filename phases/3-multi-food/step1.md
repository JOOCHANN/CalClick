# Step 1 — multi-food-prompt

## 목표
LLM이 한상차림의 **여러 음식을 각각** 탐지. 각 음식마다 top-N 후보를 제시.

## 변경 스키마
`/api/recognize` 응답:
```json
{
  "items": [
    {
      "label": "국",                // 선택적 역할 라벨 (국/밥/반찬/메인 등)
      "candidates": [
        { "name": "김치찌개", "grams": 350, "confidence": 0.9, "food_id": "kimchi_jjigae", "kcal_per_100g": 62 },
        { "name": "두부김치찌개", "grams": 350, "confidence": 0.6, "food_id": null, "kcal_per_100g": null }
      ]
    }
  ]
}
```

## 작업
1. `src/types/recognition.ts`: `RecognitionResult = { items: RecognitionItem[] }`. 기존 `{candidates}` 제거.
2. 시스템 프롬프트: "한상차림 1장에서 **각 음식(국·밥·반찬·메인 등)**을 모두 찾아 각각에 대해 상위 1~3개 후보를 제시하라." 1~5개 items, 각 item당 1~3 candidates.
3. `/api/recognize` route: LLM 응답 파싱 → 모든 candidate name을 batch alias lookup → items에 food_id/kcal_per_100g 주입.
4. Vitest: 스키마 변경 반영, 성공/실패 케이스 유지.

## Acceptance Criteria
- 한상차림 사진에 items.length ≥ 2 (다중 음식 감지 확인)
- 단일 음식 사진에도 items.length ≥ 1 동작
- 기존 /api/meals POST 계약(`candidates: [{name, grams}]`)은 그대로 유지 — Step 2가 변환

## 금지
- items 없는 구형 응답 포맷 반환
- 자유문자열 저장 (여전히 food_aliases 경유)
