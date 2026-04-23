# Phase 6 — PWA Polish

## 한 줄 목표
설치 가능한 PWA로 만들고, 실사용 시 "앱처럼" 느껴지게 한다.

## Gate (수정됨)
- 홈화면 설치 동작: iOS Safari + Android Chrome에서 "홈 화면에 추가" 시 아이콘·이름 정상, 스탠드얼론 모드로 뜸
- Lighthouse PWA installability 통과 (manifest + icon + 서비스워커 등록)
- 스모크 E2E 1개: 로컬 dev에서 로그인 → 홈 → 촬영 → 저장까지 < 10초

## 범위 (이번 phase에서 만들 것)

### step1 — Manifest & 아이콘 풀셋
- `public/manifest.webmanifest` 정리: name, short_name=CalClick, theme_color=#FF8A95, background_color=#FFF5F2, display=standalone, start_url=/
- 아이콘: 192·512 PNG + 512 maskable · `apple-touch-icon` 180px · favicon 32
- `layout.tsx`에 `<link rel="apple-touch-icon" />` + `<meta name="theme-color" />` 확인

### step2 — 최소 Service Worker
- `public/sw.js` 수동 작성 (next-pwa 의존 없이)
- 전략: 정적 asset은 stale-while-revalidate, `/api/*`는 네트워크만 (캐시 금지), 오프라인 시 `/offline` fallback
- `app/offline/page.tsx` 신규 (정적)
- SW 등록은 `app/layout.tsx`에서 `useEffect`로 클라이언트 등록

### step3 — iOS Safari 스탠드얼론 확인
- `apple-mobile-web-app-capable` 메타, 상단 safe-area 대응 (`env(safe-area-inset-top)` → padding top)
- 홈 상단 로고 영역에 safe-area padding 적용
- iOS에서 홈화면 추가 유도 1회 배너 (7일 쿨다운, localStorage)

### step4 — 스모크 E2E
- Playwright 단일 테스트: `tests/e2e/capture-to-save.spec.ts`
- 로그인 세션은 storage state 재사용 (pre-auth)
- 타이밍: 촬영 버튼 클릭 → "저장됨" 토스트까지 < 10초
- `npm run test:e2e` 스크립트 확인 (이미 있는지)

### step5 — 성능·접근성 빠른 패스
- `next/image`로 교체 가능한 `<img>` 검토 (`/me` 사진들)
- `prefetch=false`로 무거운 링크 조정 (홈↔마이 자동 prefetch 끄기)
- aria-label 누락 버튼 보완 (Lighthouse 기반)

## Deferred (이번 phase에서 하지 않음)
- 오프라인 촬영 큐잉 (IndexedDB + background sync) — 구조 복잡, 별도 phase 가치
- 자체 푸시 알림
- E2E CI 통합 (Cloudflare Tunnel 환경 고려 필요)
- 아이콘 splash 세트 (iOS 각 해상도별 splash 이미지)

## 리스크
| 리스크 | 대응 |
|---|---|
| SW가 기존 Next.js HMR·Turbopack과 충돌 | 개발 모드에서는 SW 등록 skip (`if (process.env.NODE_ENV === 'production')`) |
| iOS SW 캐시가 이전 빌드를 고정 | `sw.js`에 버전 해시 + `skipWaiting`+`clientsClaim` |
| 아이콘 maskable safe zone 어김 | 원본을 80% 안쪽에 배치, 여백 포함해 512px 제작 |

## 작업 순서
step1 (아이콘/manifest) → step2 (sw.js) → step3 (iOS safe-area) → step4 (E2E) → step5 (perf).
step1+2만으로 홈화면 설치 gate는 통과 가능. step3는 UX 완성도, step4~5는 검증.

## 다음 확인 포인트
- 아이콘 원본 이미지가 있는지 (`public/logo.svg`만 현재 확인됨) → 없으면 512px PNG 생성 방법 합의
- Cloudflare Tunnel 배포에서 SW scope 이슈 있는지 실환경 확인 필요
