# Development

## 로컬 실행
```bash
npm install
npm run dev         # localhost:3000
npm run lint
npm test            # Vitest
npm run test:e2e    # Playwright (E2E_STORAGE_STATE 필요)
```

## 환경변수 (`.env.local`)
`.env.example` 참고.

- `OPENAI_API_KEY` · `OPENAI_BASE_URL` (AI Gateway `/compat` endpoint)
- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`

## 아키텍처 원칙
- 외부 API(OpenAI/식약처)는 `app/api/*` 라우트 핸들러에서만 호출 — 키 노출 방지
- Supabase 테이블은 RLS 필수 (`user_id = auth.uid()`)
- LLM 출력 음식명은 `food_aliases` 경유로 `food_id`로 정규화 — 자유 문자열 `meal_items` 저장 금지
- 현재 phase 범위 외의 코드 추가 금지
- Server Component 기본. 상호작용만 Client Component

자세한 내용: [ARCHITECTURE.md](ARCHITECTURE.md) · [ADR.md](ADR.md) · 프로젝트 루트 [CLAUDE.md](../CLAUDE.md)
