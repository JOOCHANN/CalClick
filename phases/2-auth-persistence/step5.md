# Step 5 — today-from-db (localStorage 제거)

## 목표
오늘 kcal 합계를 서버에서 조회. Phase 1 localStorage 완전 제거.

## 작업
1. `src/app/api/meals/today/route.ts` GET — 오늘(사용자 타임존 기준) meals sum(total_kcal).
2. `src/app/page.tsx` — `useSyncExternalStore` → `useQuery`(선택) 또는 서버 컴포넌트 래퍼로 대체. `/api/meals/today` fetch.
3. `src/lib/storage.ts`, `storage.test.ts` 삭제. 관련 import 제거.
4. 새로고침 + 다른 브라우저 로그인 → 오늘 kcal 동일 확인.
5. Vitest: 오늘 합계 계산 (UTC 경계 케이스 포함).

## Acceptance Criteria
- localStorage 관련 코드 0 (`rg localStorage src/` 결과 없음).
- 저장 직후 홈 상단 오늘 kcal 즉시 반영.
- 로그아웃/로그인 왕복 후에도 값 유지.

## 금지
- localStorage 재도입.
- 서버 시간 기준 date (사용자 로컬 타임존 기준, Supabase `timezone()` 또는 클라이언트 offset).
