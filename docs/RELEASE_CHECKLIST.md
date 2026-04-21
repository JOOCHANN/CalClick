# Release Checklist

실 서비스 공개 전 반드시 확인. 개발/데모 단계는 통과 가능.

## 인증
- [ ] Supabase **Authentication → Sign In / Providers → Confirm email 토글 ON** (현재 데모용 OFF)
- [ ] 또는 Magic Link / OAuth 전환 결정
- [ ] Password 최소 길이 / 복잡도 정책 검토 (현재 6자)

## 키 / Secret
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 노출 이력 확인 + 필요 시 Dashboard에서 rotation
- [ ] `OPENAI_API_KEY` 노출 이력 확인 + rotation
  - `.env.local`, git 과거 커밋, Cloudflare Secret 모두 점검
- [ ] `.env.example`에 실제 키 없는지 재확인
- [ ] GitHub secret scanning alert 해소

## 비용 가드
- [ ] OpenAI 사용량 알림 / 월 한도 설정
- [ ] `/api/recognize` rate limit 재검토 (현재: 유저당 10회/분)
- [ ] `/api/meals` rate limit 재검토 (현재: 유저당 60회/분)
- [ ] Cloudflare AI Gateway 캐싱 전략 결정 (이미지 해시 키)

## 데이터 / 법규
- [ ] `docs/PRIVACY.md` 내용 법무 검토
- [ ] `/privacy` 페이지와 PRIVACY.md 동기화
- [ ] 계정 삭제 동작 실제 환경에서 end-to-end 확인
- [ ] 식약처/농진청 공식 DB 반영 여부 (MVP는 `source='manual'`로 허용, 공식 claim 전 필수)

## 운영
- [ ] Cloudflare Workers **Build Variables**와 **Worker Secrets** 둘 다 셋업되어 있는지 재확인
  - Build: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client 번들에 박힘)
  - Runtime Secret: 위 2개 + `SUPABASE_SERVICE_ROLE_KEY` + `OPENAI_API_KEY` + `OPENAI_BASE_URL`
- [ ] Supabase RLS 정책 전수 검증 (타 유저 토큰으로 meals/meal_items SELECT/UPDATE/DELETE 거부 확인)
- [ ] Cloudflare Analytics / Logs 기본 확인

## 접근성 / 모바일
- [ ] iOS Safari / Android Chrome 최신 버전 회귀 테스트
- [ ] PWA 설치 플로우 (Phase 6에서 다룸)
