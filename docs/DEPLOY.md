# Deploy

Cloudflare Workers + `@opennextjs/cloudflare` 사용 (Vercel 아님).

```bash
npm run cf:build    # OpenNext 번들 + static 자산
npm run cf:deploy   # wrangler deploy
```

## 환경변수 이중 관리 (중요)
Cloudflare는 빌드 시점과 런타임 시점이 분리돼 있어 **두 곳 모두** 값을 넣어야 함.

| 위치 | 용도 | 필요 변수 |
|---|---|---|
| **Build → Variables and secrets** | `next build`가 client JS 번들에 박음 (브라우저에서 사용) | `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Worker → Variables and Secrets** | Worker 런타임에서 server 코드가 `process.env`로 읽음 | 위 2개 + `SUPABASE_SERVICE_ROLE_KEY` · `OPENAI_API_KEY` · `OPENAI_BASE_URL` |

Build 쪽만 넣고 Runtime이 비면 server 코드 500. Runtime만 넣고 Build가 비면 브라우저 Supabase 호출 hang.

## AI Gateway 엔드포인트 포맷
`OPENAI_BASE_URL`은 **반드시 `/compat`까지만** 넣고 `/chat/completions`는 붙이지 않음:
```
https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/compat
```
OpenAI SDK가 `/chat/completions`를 자동으로 붙임. 두 번 붙으면 404.

## 서비스워커 캐시 버스팅
`public/sw.js` 상단 `VERSION` 상수를 배포마다 변경해야 iOS Safari가 이전 빌드를 고정하지 않음.

## 체크리스트
배포 전 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) 확인.
