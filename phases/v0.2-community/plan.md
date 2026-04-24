# v0.2 — Community (칼로리 관리 커뮤니티)

## 한 줄 목표
혼자 기록하는 앱에서 **같이 기록하는 앱**으로. 한상차림·공식 DB·공유식사라는 CalClick만의 차별점을 커뮤니티 안에서도 살린다.

## 왜 커뮤니티인가 (경쟁 분석)
- **MyFitnessPal** — 포럼·팁 공유·챌린지. 글로벌 1위가 된 결정적 lock-in이 커뮤니티 네트워크 효과.
- **Lose It!** — 커뮤니티 챌린지로 리텐션 확보.
- **Noom** — "코치"와 그룹 심리학 프로그램으로 프리미엄 정당화.
- **FatSecret** — 레거시지만 포럼 축적이 자산.
- **Cal AI** — 개인화 AI는 강력하지만 커뮤니티가 없어 MyFitnessPal에 2026/03 인수됨.

→ **인사이트**: AI 인식 정확도만으로는 장기 리텐션이 안 난다. 친구·비교·챌린지가 "내일 또 여는 이유"를 만든다. v0.1은 도구, v0.2는 네트워크.

## CalClick만의 차별 커뮤니티 (한식 + 공식 DB = 새로운 앵글)
이미 가지고 있는 자산을 커뮤니티 UX로 바꿔야지, MyFitnessPal 베끼지 말 것.

1. **"같은 메뉴 먹은 사람들" 비교** — 식약처 food_id 정규화가 이미 되어 있으므로, "이 김치찌개 먹은 사람들 평균 칼로리 480kcal, 당신은 520kcal" 같은 즉시 비교. Cal AI는 자유문자열이라 불가.
2. **한상차림 피드** — 인스타처럼 밥상 1장을 올리면 음식 태그(국·밥·반찬별)가 자동으로 붙는다. 텍스트 안 써도 되는 게 차별점.
3. **공유 식사 초대** — "오늘 4명이서 부대찌개 먹음" 기록을 식사에 함께한 친구에게 공유 → 상대방의 일기에도 ÷4로 자동 반영. 바이럴 루프.
4. **로컬리티** — 지역·나이대 필터 (예: "30대 서울 사무직이 평균 섭취하는 점심 kcal"). 글로벌 앱이 못 하는 한국 컨텍스트.

## Gate (v0.2 출시 기준)
- 홈 탭 옆에 **"피드"** 탭 — 팔로우한 사람 식단 스트림 + 발견 탭
- 식사 저장 후 **"공유하기"** 1탭으로 피드에 게시 가능 (비공개 기본값)
- 좋아요·댓글 작동, 알림 아이콘에 배지
- 최소 1개 챌린지 참여/진행 가능 ("1주일 1500kcal 챌린지" 같은)
- 같은 food_id 먹은 사람 비교 카드 1개 노출
- RLS로 비공개 글은 본인만 읽기 · 신고 1차 처리 (hide)

## 범위 (sub-phases — 각 3-5일)

### v0.2-a — 소셜 기초 (3일)
- `profiles` 공개 뷰 (닉네임·아바타·스트릭·총 기록수)
- `follows(follower_id, followee_id)` 테이블 + RLS
- 팔로우 버튼 · 팔로워/팔로잉 리스트
- 공개 프로필 페이지 `/u/[nickname]`

### v0.2-b — 피드 & 인터랙션 (4일)
- `posts` 테이블: `id, user_id, meal_id FK, caption, visibility(public|followers|private), created_at`
- `likes(post_id, user_id)` · `comments(id, post_id, user_id, body)`
- meal 저장 시 "피드에 공유" 토글 (기본 OFF — 개인정보)
- 피드 탭: 팔로잉 / 발견(전체 public) 서브탭
- 댓글·좋아요·시간 표시

### v0.2-c — 같은 음식 비교 & 인사이트 (3일)
- food_id 기준 집계 View: 평균 kcal, 최빈 중량, 상위 동반 음식
- 식사 상세에 **"같은 음식 먹은 사람들"** 카드
- 주간 인사이트 푸시: "이번주 김치찌개 3번, 전국 평균보다 120kcal 적었어요"

### v0.2-d — 챌린지 (4일)
- `challenges(id, title, rule_json, starts_at, ends_at, creator_id)`
- `challenge_participants(challenge_id, user_id, joined_at, progress_json)`
- 규칙 타입 (MVP): `daily_kcal_under`, `log_streak_days`, `protein_over_g`
- 리더보드 (익명화 옵션) · 완료 뱃지
- 시드 챌린지 3개 운영자 생성 (추석 맛있게 먹기, 단백질 100g 1주일 등)

### v0.2-e — 알림 & 모더레이션 (3일)
- Web Push (Service Worker — v0.1의 sw.js 확장) · 좋아요/댓글/팔로우/챌린지 이벤트
- OpenAI Moderation API — 댓글·캡션 검수
- 신고 플로우: 1회 신고 → hidden, 3회 → 자동 삭제 + 운영자 알림
- 차단 기능 (`blocks(blocker_id, blocked_id)`)

## Deferred (v0.3+ 후보)
- DM (1:1 메시징) — 관리·신고 부담 큼
- 그룹·소모임 (회사·가족·친구) — 별도 phase 가치
- 레시피 공유 (사용자 작성 레시피 + 재료 단위) — 데이터 모델 재설계 필요
- 인플루언서/전문가 프로그램 — 수익화 논의 선행
- 지역·나이대 필터 — 개인정보 수집 정책 재검토 필요
- iOS 네이티브 푸시 (웹 푸시는 iOS 16.4+에서만 작동, PWA 홈추가 필수)

## 자기 검토 (plan v1 약점 3개)
1. **"피드에 공유" 기본값을 ON으로 하면 개인정보 유출** → 기본값 OFF + 첫 공유 시 1회 안내 모달. 식단은 건강정보라 민감.
2. **챌린지 리더보드에 본명·체중 노출하면 신규 유저 진입장벽** → 닉네임만, 체중 순위 금지 (이탈 트리거). kcal·기록 연속일 중심.
3. **"같은 음식 비교"가 소수 데이터(<10명)로 돌아가면 편향** → n<30일 때 비교 카드 숨김, "데이터가 쌓이는 중" UI.

## 리스크 & 대응
| 리스크 | 대응 |
|---|---|
| 신고·음란물 스팸 | Moderation API + 신고 3회 자동숨김 + 운영자 수동 검수 대시보드 |
| 비교 기능이 섭식장애 트리거 | "다른 사람보다 많이 먹었어요" 같은 부정 워딩 금지, 중립 표현. 경고 카피 검토 |
| 개인정보보호법 (건강정보) | 피드 공개 전 동의 플로우 재확인, 탈퇴 시 posts/comments까지 함께 삭제 |
| Web Push on iOS | PWA 설치된 유저만 대상 — 홈화면 추가 안내 배너 v0.1에서 이미 준비됨 |
| 무한스크롤 비용 (Cloudflare Workers 요청수) | 피드는 cursor pagination (20개/페이지) · Supabase RLS 최적화 |

## 데이터 모델 추가 (요약)
```
follows(follower_id FK, followee_id FK, created_at) UNIQUE(follower, followee)
posts(id PK, user_id FK, meal_id FK NULLABLE, caption TEXT, visibility ENUM, created_at)
likes(post_id FK, user_id FK) UNIQUE(post, user)
comments(id PK, post_id FK, user_id FK, body TEXT, created_at, hidden_at)
blocks(blocker_id FK, blocked_id FK) UNIQUE
reports(id PK, reporter_id FK, target_type ENUM, target_id, reason, created_at)
challenges(id PK, title, rule_json, starts_at, ends_at, creator_id)
challenge_participants(challenge_id FK, user_id FK, joined_at, progress_json) UNIQUE
notifications(id PK, user_id FK, type ENUM, payload_json, read_at, created_at)
```
RLS 원칙: **읽기는 visibility + blocks 기반**, 쓰기는 `user_id = auth.uid()` only.

## 작업 순서
a (소셜 기초) → b (피드) → c (비교 인사이트) → d (챌린지) → e (알림·모더레이션).
각 sub-phase가 독립 배포 가능해야 함. b까지만 나가도 "공유되는 앱"은 성립.

## 합계
17일 풀타임 예상. 파트타임 6-8주.
