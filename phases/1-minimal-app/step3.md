# Step 3 — /api/recognize (GPT-4o Vision)

## 목표
POST 이미지 → GPT-4o Vision → zod-validated JSON 응답. 클라이언트에서 키 노출 없음.

## 작업
1. `npm i openai zod`
2. `src/services/openai.ts` — OpenAI 클라이언트 래퍼 (env `OPENAI_API_KEY` 로드, `new OpenAI({...})`).
3. `src/types/recognition.ts` — zod 스키마:
   ```ts
   export const FoodCandidate = z.object({
     name: z.string().min(1),
     grams: z.number().positive(),
     confidence: z.number().min(0).max(1),
   });
   export const RecognitionResult = z.object({
     candidates: z.array(FoodCandidate).min(1).max(5),
   });
   ```
4. `src/app/api/recognize/route.ts` — POST multipart/form-data `image` 필드:
   - 이미지 base64 변환.
   - GPT-4o Vision 호출 (`model: "gpt-4o"`, `response_format: { type: "json_object" }`):
     ```
     시스템: 너는 한식 영양 분석 전문가다. 사진에서 음식을 찾아 상위 3개 후보를 JSON으로만 답하라.
     사용자: {"candidates":[{"name":"한국어 음식명","grams":추정 중량,"confidence":0-1}]} 형식으로만 반환. 기준물(숟가락 15cm, 밥공기 직경 10cm)이 보이면 중량 반영.
     ```
   - zod 파싱 실패 시 400 + 원본 응답 로깅.
   - 성공 시 200 + `RecognitionResult`.
5. `src/app/api/recognize/route.test.ts` (Vitest) — OpenAI 클라이언트 mock → 정상/스키마 오류/이미지 없음 3 케이스.
6. Vitest 설정: `npm i -D vitest @vitest/ui`, `vitest.config.ts`.
7. `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

## Acceptance Criteria
- Vitest 3 테스트 통과.
- 실키(`.env.local`에 `OPENAI_API_KEY`) 상태에서 `curl -F image=@sample.jpg http://localhost:3000/api/recognize` → 200 + JSON.
- 키 누락/잘못된 이미지 → 400 + 명확한 에러 메시지.
- OpenAI 클라이언트는 오직 이 라우트에서만 import (CLAUDE.md CRITICAL).

## 필요한 사용자 입력
- `OPENAI_API_KEY` — `.env.local` 작성.

## 금지
- UI 구현 (Step 4).
- 인증/DB 관련 코드 (Phase 2).
