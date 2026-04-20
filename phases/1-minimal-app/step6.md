# Step 6 — Cloudflare Tunnel + iOS 카메라 검증

## 목표
로컬 `npm run dev` 서버를 Cloudflare Tunnel로 HTTPS 노출. 실제 iPhone에서 카메라 캡처 → 저장까지 작동 검증.

## 작업
1. `cloudflared` 설치 (사용자): `brew install cloudflared`
2. 빠른 터널 (계정 불필요, 임시 URL):
   ```
   npm run dev
   cloudflared tunnel --url http://localhost:3000
   ```
   → `https://xxxx-xxxx.trycloudflare.com` URL 출력.
3. (선택) 영구 터널 — Cloudflare 계정 + 도메인 있을 때:
   - `cloudflared tunnel login`
   - `cloudflared tunnel create calclick`
   - DNS 라우트 설정.
4. `phases/1-minimal-app/DEPLOY.md` 작성:
   - 터널 실행 커맨드, `.env.local` 체크리스트, 주의사항(quick tunnel URL은 재시작마다 변경).
5. iPhone 검증 체크리스트 (사용자 수행):
   - [ ] 터널 URL 접속 (HTTPS 확인)
   - [ ] 홈 화면 추가 → standalone 실행
   - [ ] 카메라 버튼 → 촬영 다이얼로그 열림
   - [ ] 촬영 → 분석 → 결과 카드 표시
   - [ ] 저장 → 오늘 kcal 증가
   - [ ] 새로고침 후에도 합계 유지

## Git
- Remote: `https://github.com/JOOCHANN/CalClick.git`
- `.env.local`은 커밋 금지 (`.gitignore` 확인).
- Conventional commits: `feat(phase-1-minimal-app): ...`

## Acceptance Criteria
- Cloudflare Tunnel URL 200 응답 + HTTPS.
- iPhone 6가지 체크리스트 모두 통과.
- `OPENAI_API_KEY`는 로컬 `.env.local`에만 (Git 미커밋).

## 필요한 사용자 입력
- `cloudflared` 설치.
- iPhone 실기 테스트.

## 금지
- 프로덕션 디버그 `console.log` 잔존.
- API 키를 클라이언트 번들에 노출 (`NEXT_PUBLIC_` prefix 금지).
- `.env.local` 커밋.
