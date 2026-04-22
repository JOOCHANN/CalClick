# Phase 5 — Goals & Stats

## 현재 상태 점검 (Phase 4.5 끝난 시점)

**이미 있는 것**
- `profiles(id, created_at, privacy_accepted_at)` — 신체 정보 필드 없음
- `/api/stats/daily` 월별 일일 kcal, `/api/stats/weekly` 지난/이번 주 평균, `/api/stats/photos` 갤러리
- 홈: 오늘 총 kcal 숫자만 (목표 대비 없음)
- 마이: 월 달력·주간 바·사진 갤러리

**아직 없는 것 (Phase 5가 채울 부분)**
1. 사용자 신체정보 (성별·생년·키·체중·활동량)
2. 목표 칼로리 (수동 지정 또는 BMR/TDEE 자동 계산)
3. 목표 대비 오늘 남은 kcal UI
4. 체중 로그 (일자별 한 건)
5. 긴 기간 추세 (월간 평균, 체중 라인)

## Phase 5 차별점 (MVP 한 줄)
> 내 몸·목표를 한 번 입력하면 오늘 남은 kcal과 체중 추세를 같이 보여 주는 한국 식단 관리 앱.

Cal AI 대비 차별점은 유지 (한상차림·공식 DB·공유 식사). Phase 5는 **개인화 레이어**.

## 범위 결정 (MVP에 넣을 것만)
- ✅ 프로필 입력 (성별·생년·키·체중·활동량)
- ✅ 자동 BMR·TDEE 계산 + 수동 오버라이드
- ✅ 목표 대비 progress ring (홈 상단)
- ✅ 체중 로그 (날짜 하나에 한 값)
- ✅ 마이 페이지 하단에 월간 평균 kcal + 체중 라인 차트
- ❌ 매크로 목표 (탄/단/지) — v2
- ❌ 주간 리포트 알림 — Phase 6 PWA
- ❌ 친구/랭킹 — 범위 밖

## 데이터 모델 변경

### profiles 확장 (0005_profile_goals.sql)
```sql
alter table profiles
  add column if not exists sex text check (sex in ('male', 'female')),
  add column if not exists birth_year int check (birth_year between 1900 and 2100),
  add column if not exists height_cm numeric check (height_cm between 50 and 250),
  add column if not exists current_weight_kg numeric check (current_weight_kg between 20 and 400),
  add column if not exists activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  add column if not exists goal_kcal int check (goal_kcal between 800 and 6000),
  add column if not exists goal_type text check (goal_type in ('cut', 'maintain', 'bulk')),
  add column if not exists onboarded_at timestamptz;
```
- 기존 RLS `own profile`이 그대로 커버. 정책 추가 작업 없음.

### weight_logs (0006_weight_logs.sql)
```sql
create table if not exists weight_logs (
  user_id uuid not null references auth.users on delete cascade,
  logged_on date not null,
  weight_kg numeric not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  primary key (user_id, logged_on)
);
alter table weight_logs enable row level security;
create policy "own weight" on weight_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
- 하루 한 건 (upsert). `profiles.current_weight_kg`는 가장 최근 log로 트리거 동기화 또는 API에서 명시적 복사.

## 계산식 (lib/calorie-targets.ts)
- BMR = Mifflin-St Jeor
  - 남: `10*kg + 6.25*cm - 5*age + 5`
  - 여: `10*kg + 6.25*cm - 5*age - 161`
- 활동 계수: sedentary 1.2 / light 1.375 / moderate 1.55 / active 1.725 / very_active 1.9
- TDEE = BMR × 활동
- 목표
  - cut: TDEE − 500 (하한 BMR × 1.1)
  - maintain: TDEE
  - bulk: TDEE + 300

## 단계 (Steps)

### step1 — schema + profile API
- 마이그레이션 0005·0006 작성 + 적용 스크립트
- `GET/PATCH /api/profile` — 신체정보·목표 읽기/쓰기
- 계약 테스트: 타 유저 토큰 격리, check 제약 위반

### step2 — 온보딩 플로우
- 첫 로그인(혹은 profile 미완) 시 `/onboarding` 리다이렉트
- 3스텝 카드: (1) 성별·생년·키 (2) 체중·활동량 (3) 목표 선택 → 자동 계산 값 미리보기 + 수동 오버라이드
- 완료 시 `onboarded_at` 세팅, 홈으로

### step3 — 홈 progress ring
- 상단 기존 숫자를 링 차트로 교체: 먹은 kcal / 목표 kcal, 남은 수치
- 목표 초과 시 빨강 톤·"{초과량} kcal 초과" 뱃지
- 목표 미설정이면 기존 숫자 유지 + "목표 설정하기" CTA

### step4 — 체중 로그 UI + API
- `POST /api/weight` upsert (today default)
- 마이 페이지에 "오늘 체중" 카드 (입력 + 최근 7일 스파크라인)
- 입력 시 `profiles.current_weight_kg`도 같이 업데이트 → 목표 재계산 프롬프트

### step5 — 장기 추세 차트 (Recharts)
- 마이 하단 섹션: 월간 평균 kcal (최근 6개월) + 목표 라인
- 체중 라인 차트 (최근 90일)
- Recharts 도입 (번들 증가 <30kb 확인)

### step6 — 설정에서 목표 수정
- `/settings` 에 프로필·목표 편집 섹션
- 자동 계산 재적용 vs 수동 값 유지 토글

## Gate (수치)
- RLS: 타 유저 weight_log 접근 거부 (계약 테스트)
- Lighthouse 성능 저하 < 5점 (링/차트 추가 후)
- 온보딩 완료 → 홈 링 표시까지 클라이언트 라운드트립 ≤ 2회
- BMR/TDEE 계산 유닛테스트 (남녀 × 활동 5단계 = 10 케이스)

## 리스크 & 대응
| 리스크 | 대응 |
|---|---|
| 목표 계산식 정확도 논란 | Mifflin-St Jeor 근거 표시 + 수동 오버라이드 가능 |
| 온보딩 이탈률 | 스킵 허용, 나중에 설정에서 입력 가능 (단 홈 CTA 유지) |
| 체중 민감 정보 | RLS + 키도 본인만, 공유 카드 등에 노출 금지 |
| Recharts 번들 증가 | dynamic import + 마이 페이지에서만 로드 |

## Phase 4/4.5 잔여 (Phase 5 진입 전 확정 여부)
- [ ] 주간 차트 `current_avg === 0` 빈 상태 (현재 섹션 자체가 비어보임 — 작은 이슈)
- [ ] 편집 모드 이탈 시 unsaved drafts 확인 (작은 위험, 사용 패턴상 드문 실수)
- [ ] 모달 포커스 트랩 (a11y)

→ Phase 5 첫 step 시작 전 10분 이내 묶어 처리하거나, Phase 6 polish에 합치기. **권장: Phase 6으로 미룸** (goal 링·차트가 더 큰 사용자 가치).

## 예상 소요
2-3일 풀타임. Step1-2 (스키마·온보딩) 1일, Step3-4 (링·체중) 1일, Step5-6 (차트·설정) 1일.
