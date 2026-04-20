# Phase 1 Deploy — Cloudflare Tunnel

## 1. 환경 변수
`.env.local`:
```
OPENAI_API_KEY=sk-...
```
(.gitignore에 의해 커밋되지 않음)

## 2. 로컬 서버 + 터널
터미널 2개:

**T1 — Next.js dev**
```
npm run dev
```

**T2 — Cloudflare Tunnel (quick, 계정 불필요)**
```
brew install cloudflared   # 최초 1회
cloudflared tunnel --url http://localhost:3000
```
→ 출력 예시: `https://<random>.trycloudflare.com`
→ quick tunnel URL은 재시작마다 바뀜.

## 3. iPhone 체크리스트
- [ ] Safari로 터널 URL 접속 (HTTPS 녹색 자물쇠)
- [ ] 공유 → "홈 화면에 추가"
- [ ] 홈 화면 아이콘 실행 → standalone (브라우저 바 없음)
- [ ] "사진 촬영/선택" → 카메라 다이얼로그
- [ ] 촬영 → "분석" → 결과 카드 (3-10초)
- [ ] 중량 슬라이더 → kcal 즉시 변화
- [ ] "오늘 식사에 저장" → 상단 오늘 kcal 증가
- [ ] Safari 새로고침 → 오늘 kcal 유지

## 4. 롤백
이 단계는 서버 배포가 아니므로 롤백 = 터널 종료(Ctrl+C).
GitHub에 문제 커밋 있으면: `git revert <sha>`.

## 5. Git
- Remote: `https://github.com/JOOCHANN/CalClick`
- 브랜치: `main`
- Conventional commits (`feat(phase-N-name): ...`).

## 6. 주의
- `.env.local`과 OpenAI 키 절대 커밋 금지 (GitHub push protection도 있음).
- quick tunnel URL은 공개 — 민감 데이터 주입 금지.
