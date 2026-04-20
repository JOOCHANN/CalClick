# 프로젝트: CalClick

한상차림 1장을 찍으면 국·밥·반찬을 각각 인식하고, 식약처·농진청 공식 DB에서 칼로리를 찾아, 공유 식사는 인원수로 나눠 계산하는 한국 식단 관리 PWA.

## 기술 스택
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui + lucide-react + Recharts
- Supabase (Auth, Postgres, Storage, RLS)
- OpenAI GPT-4o Vision API (Phase 0 확정 모델)
- 식약처 식품영양성분 API + 농진청 한식영양성분표
- Vitest + React Testing Library + Playwright (E2E)

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 호출(OpenAI/식약처/농진청)은 `app/api/*` 라우트 핸들러에서만 수행. 클라이언트 컴포넌트에서 직접 호출 금지 — API 키 노출 방지.
- CRITICAL: Supabase 테이블은 RLS 정책 필수. 사용자 격리되지 않은 테이블 생성 금지. 정책은 `user_id = auth.uid()`.
- CRITICAL: LLM 출력 음식명은 반드시 `food_aliases` 테이블 경유로 `food_id`로 정규화해 저장. 자유 문자열로 `meal_items`에 저장 금지.
- CRITICAL: 현재 phase 범위 외의 코드·파일 추가 금지. 범위 누수 금지.
- Server Components 기본. 상호작용(촬영/폼/슬라이더)만 Client Component.
- 컴포넌트는 `components/`, 타입은 `types/`, 외부 API 래퍼는 `services/`, 유틸은 `lib/`.

## 개발 프로세스
- CRITICAL: 새 기능은 테스트 먼저 작성하고 통과하는 구현을 짤 것 (TDD). API 라우트는 계약 테스트(input/output) 우선.
- CRITICAL: LLM 호출 로직 수정은 Phase 0의 eval set 회귀 실행 없이 금지.
- Phase gate 미통과 시 다음 phase 착수 금지.
- 커밋은 conventional commits (`feat(phase-N-name): ...`, `fix:`, `docs:`, `refactor:`, `test:`).

## 명령어
```
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # Vitest
npm run test:e2e   # Playwright
npm run eval       # Phase 0 eval set 재실행
```
