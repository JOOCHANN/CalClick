# Step 2 — Auth UI (이메일 로그인)

## 목표
Supabase Auth 이메일 로그인/가입, 세션 미들웨어, 로그아웃. 비로그인 시 홈 접근 차단.

## 작업
1. `src/app/(auth)/login/page.tsx` — 이메일/비번 입력 → `supabase.auth.signInWithPassword`. 실패 시 토스트.
2. `src/app/(auth)/signup/page.tsx` — 이메일/비번 → `signUp`. 이메일 확인 단계 안내.
3. `src/middleware.ts` — `@supabase/ssr`의 `updateSession` 패턴. 비로그인 사용자 `/` 접근 시 `/login`으로 리다이렉트.
4. `src/app/page.tsx` 상단 우측에 프로필 영역 (이메일 + 로그아웃 버튼).
5. `src/app/api/auth/callback/route.ts` — email confirm 처리 (필요 시).
6. 로그인 직후 `profiles` upsert (id = auth.uid()).

## Acceptance Criteria
- 가입 → 확인 이메일 → 클릭 → 로그인 상태 → `/` 접근 가능.
- 비로그인 상태에서 `/` 접속 → `/login`으로 리다이렉트.
- 로그아웃 후 재접근 → `/login`.
- `npm run build`/`lint` 통과.

## 금지
- 카카오/OAuth (Phase 3 이후).
- 비밀번호 재설정 UI (Phase 6).
