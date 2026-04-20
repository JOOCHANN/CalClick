# Step 1 — Scaffold (Next.js 15 + TS + Tailwind + shadcn/ui + Pretendard)

## 목표
프로젝트 스캐폴딩. `npm run dev/build/lint` 세 명령이 무오류로 통과하는 상태.

## 작업
1. 루트(`/Users/jcmini/projects/CalClick`)에서 `create-next-app` 실행:
   - TypeScript · strict mode · Tailwind · ESLint · App Router · `src/` · import alias `@/*`
   - 기존 `CLAUDE.md`, `docs/`, `phases/`, `scripts/`, `.env.example` 유지.
   - 기존 `.gitignore`의 커스텀 규칙은 새로 생성된 것과 병합.
2. `tsconfig.json` — `"strict": true` 확인 (create-next-app 기본).
3. 폰트: `next/font`로 Pretendard를 로드 (Google Fonts에 없으므로 `next/font/local` 또는 Pretendard CDN `@import`).
   - 간단히 CDN: `src/app/globals.css`에 `@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css");`
   - `tailwind.config.ts` `fontFamily.sans` 에 `Pretendard Variable` 추가.
4. shadcn/ui 초기화:
   - `npx shadcn@latest init` — style: `new-york`, base color: `neutral`, CSS variables: yes.
   - 컬러 토큰에 포인트 그린 `#16a34a` 반영 (UI_GUIDE.md).
5. `npm i lucide-react`.
6. `src/app/layout.tsx` — `<html lang="ko">` · `tabular-nums` body 클래스 · metadata (title: "CalClick", description: PRD 첫 줄).
7. `src/app/page.tsx` — 간단한 placeholder ("CalClick · 한상차림 1장으로 칼로리 계산") — Step 4에서 교체.
8. `src/app/globals.css` — 다크/라이트 CSS variables 정리 (shadcn 기본 + UI_GUIDE 색).

## Acceptance Criteria
- `npm run dev` → http://localhost:3000 페이지 렌더.
- `npm run build` 성공.
- `npm run lint` 무오류/무경고.
- `tsconfig.json` strict mode.
- Pretendard 폰트 적용 확인 (브라우저 네트워크 탭).
- shadcn `cn()` 유틸 사용 가능 (`@/lib/utils` 임포트 성공).

## 금지
- Step 2 이후 범위(PWA manifest, API 라우트, 업로드 UI) 선행 구현 금지.
- `any` 타입 사용 금지 (strict 유지).
