# Step 4 — 캡처 UI

## 목표
홈(`/`)에서 사진 촬영/업로드 → 미리보기 → 업로드 → 결과 카드 (음식명·중량·kcal) 표시.

## 작업
1. shadcn 컴포넌트 추가: `npx shadcn@latest add card button input slider skeleton toast`.
2. `src/app/page.tsx` (Client Component, 최상단 `"use client"`):
   - `<input type="file" accept="image/*" capture="environment">` (모바일 후방 카메라).
   - 선택 시 객체 URL로 프리뷰 표시.
   - "분석" 버튼 → `FormData`로 `/api/recognize` POST.
   - 로딩 중 Skeleton 카드 표시.
   - 성공 시 결과 카드: 후보별 `name · grams g · ≈ kcal`.
3. 클라이언트 이미지 리사이즈 `src/lib/image-resize.ts`:
   - `canvas` 사용해 `max-width 1024px`, JPEG quality 0.85로 압축.
4. 임시 kcal 계산 `src/lib/kcal-temp.ts`:
   - 하드코딩 맵 (김치찌개 62 kcal/100g, 비빔밥 160, 불고기 190, 김밥 120, 라면 110, 떡볶이 160, 기타 150 기본값).
   - Phase 2에서 식약처 DB로 교체 예정 — 이 파일에 `// TEMP_PHASE_1` 주석.
5. 중량 슬라이더 (shadcn `Slider`) — 50g 스냅, kcal 즉시 재계산.
6. 에러 토스트 (네트워크/인식 실패).

## Acceptance Criteria
- 데스크톱 브라우저에서 파일 선택 → 결과 카드 렌더.
- 모바일 브라우저에서 카메라 호출 (Safari/Chrome).
- 이미지 ≤1024px 리사이즈 확인 (네트워크 탭 페이로드 < 300KB).
- `npm run lint` · `build` 통과.
- 결과 로딩 3-10초 허용 (GPT-4o 응답).

## 금지
- localStorage/저장 로직 (Step 5).
- 인증 UI (Phase 2).
