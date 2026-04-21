# CalClick

한상차림 1장을 찍으면 국·밥·반찬을 각각 인식하고, 식약처·농진청 공식 DB에서 칼로리를 찾아, 공유 식사는 인원수로 나눠 계산하는 한국 식단 관리 PWA.

## 🚀 지금 체험하기

**데모 링크**: [https://calclick.green261535.workers.dev](https://calclick.green261535.workers.dev)

1. 이메일로 가입 (이메일 인증 없이 바로 사용 가능 — 데모용)
2. 홈 화면에서 음식 사진 촬영/선택 → **분석**
3. 상위 후보 중 하나 선택 → **오늘 식사에 저장**
4. 상단 "오늘 섭취 kcal"에 반영

> ⚠️ 데모 단계라 데이터는 예고 없이 초기화될 수 있습니다. 개인정보는 [설정 → 계정 삭제]에서 즉시 영구 삭제 가능.

## 스택
Next.js 15 · Tailwind · shadcn/ui · Supabase · OpenAI GPT-4o Vision · Cloudflare Workers (via `@opennextjs/cloudflare`) · Cloudflare AI Gateway

## 개발
```bash
npm install
npm run dev        # localhost:3000
npm run lint
npm test
npm run build
```

`.env.local` 필수 키 (`.env.example` 참고):
- `OPENAI_API_KEY`, `OPENAI_BASE_URL` (AI Gateway `/compat` endpoint)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## 배포 (Cloudflare)
```bash
npm run cf:build   # OpenNext 번들 + static 자산
npm run cf:deploy  # wrangler deploy
```

### 환경변수 이중 관리 (중요)
Cloudflare는 빌드 시점과 런타임 시점이 분리돼 있어 **두 곳 모두** 값을 넣어야 함.

| 위치 | 용도 | 필요 변수 |
|---|---|---|
| **Build → Variables and secrets** | `next build`가 client JS 번들에 박음 (브라우저에서 사용) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Worker → Variables and Secrets** | Worker 런타임에서 server 코드가 `process.env`로 읽음 | 위 2개 + `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` |

Build 쪽만 넣고 Runtime이 비면 server 코드 500. Runtime만 넣고 Build가 비면 브라우저 Supabase 호출 hang.

### AI Gateway 엔드포인트 포맷
`OPENAI_BASE_URL`은 **반드시 `/compat`까지만** 넣고 `/chat/completions`는 붙이지 않음:
```
https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/compat
```
OpenAI SDK가 `/chat/completions`를 자동으로 붙임. 두 번 붙으면 404.

## 배포 전 체크
[docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) 참고.

## Phase 진행
- [x] Phase 0 — Core PoC (eval 스킵, GPT-4o 확정)
- [x] Phase 1 — Minimal Web App
- [x] Phase 2 — Auth + 영속화
- [ ] Phase 3 — 한상차림 다중 음식 (차별점)
- [ ] Phase 4 — Daily Diary
- [ ] Phase 5 — Goals & Stats
- [ ] Phase 6 — PWA Polish
