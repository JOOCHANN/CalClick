# CalClick

한상차림 사진 한 장으로 국·밥·반찬을 각각 인식하고, 식약처 공식 DB로 칼로리를 계산해주는 한국형 식단 관리 PWA.

**🔗 Demo** · [calclick.green261535.workers.dev](https://calclick.green261535.workers.dev) — iOS Safari에서 공유 → "홈 화면에 추가"로 앱처럼 설치

---

## 📌 Versions

| 버전 | 상태 | 주제 | 문서 |
|---|---|---|---|
| **v0.1** | ✅ Released | PWA MVP — 한상차림 인식 · 식단일기 · 목표·통계 · PWA 설치 | [CHANGELOG](#v01--released) |
| **v0.2** | 🛠 In Progress | 칼로리 관리 커뮤니티 — 피드 · 챌린지 · 같은 음식 비교 | [plan](phases/v0.2-community/plan.md) |
| v0.3+ | 📅 Planned | DM · 그룹 · 레시피 공유 · 지역 인사이트 | — |

### v0.1 — Released
- 📷 사진 → 다중 음식 자동 인식 (한상차림 대응)
- 🧮 식약처·농진청 공식 DB 기반 칼로리·매크로
- 👥 공유 식사 ÷ 인원수 토글
- 📅 날짜별 식단 일기 · 끼니 분류 · 메모
- 🎯 BMR/TDEE 목표 kcal · 체중 로그 · 월/주 트렌드 그래프
- 📱 PWA 설치 가능 · 오프라인 폴백 · iOS safe-area

### v0.2 — In Progress (커뮤니티)
혼자 기록하는 앱 → 같이 기록하는 앱. 식약처 food_id 정규화 덕에 **"같은 메뉴 먹은 사람들 평균과 비교"** 같은 경쟁앱이 못 하는 기능이 가능.

- [ ] `v0.2-a` 소셜 기초 — 공개 프로필 · 팔로우
- [ ] `v0.2-b` 피드 — 식사 공유 · 좋아요 · 댓글
- [ ] `v0.2-c` 같은 음식 비교 — food_id 기반 평균·분포
- [ ] `v0.2-d` 챌린지 — 규칙·리더보드(닉네임 한정)
- [ ] `v0.2-e` 알림·모더레이션 — Web Push · 신고 · 차단

자세한 플랜: [phases/v0.2-community/plan.md](phases/v0.2-community/plan.md)

---

## 🧱 Tech Stack
Next.js 16 · TypeScript · Tailwind · shadcn/ui · Supabase (Auth/DB/Storage/RLS) · OpenAI GPT-4o Vision · Cloudflare Workers (OpenNext)

---

## 📖 Docs
- [PRD](docs/PRD.md) — 제품 정의 · 차별점
- [Architecture](docs/ARCHITECTURE.md) · [ADR](docs/ADR.md) · [UI Guide](docs/UI_GUIDE.md)
- [Development](docs/DEVELOPMENT.md) — 로컬 실행 · 환경변수 · 규칙
- [Deploy](docs/DEPLOY.md) — Cloudflare Workers 배포 가이드
- [Privacy](docs/PRIVACY.md) · [Release Checklist](docs/RELEASE_CHECKLIST.md)
