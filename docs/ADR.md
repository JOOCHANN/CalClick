# Architecture Decision Records

## 철학
- MVP 속도 최우선. PoC가 통과되기 전에는 스택을 늘리지 않는다.
- 외부 의존성 최소. 대체 불가능한 것만 선택.
- 현재 phase 범위 외의 최적화·확장 금지.

---

### ADR-001: 플랫폼은 PWA (Next.js 15)
**결정**: React Native/Flutter 대신 Next.js App Router + PWA manifest.
**이유**:
- 카메라·업로드·결과 편집만 있으면 충분한 UX 범위.
- 앱스토어 심사 없이 배포·업데이트 가능 (MVP 속도).
- 개발자가 웹 스택에 이미 익숙 (가정).
**트레이드오프**: iOS 백그라운드 알림 제약, 홈화면 설치 유도 UX 필요. 네이티브 카메라 경험 일부 저하.

---

### ADR-002: 인식 전략은 "GPT-4o Vision + 식약처 DB" 하이브리드 · 실사용 검증
**결정**: 1차 **OpenAI GPT-4o Vision**으로 음식명·수량 추출 → 2차 `/api/food/search`가 `food_aliases` → `foods` 조회.
**이유**:
- 사용자가 OpenAI 크레딧 보유 — 추가 벤더 관리·키 발급 오버헤드 제거.
- GPT-4o는 다국어·다문화 음식 커버리지가 Vision 모델 중 가장 넓다고 알려짐.
- 자체 한식 분류기 파인튜닝은 데이터·시간 비용 과다 (MVP 부적합).
- 공식 DB 매칭으로 수치 신뢰도 확보 (Cal AI 대비 차별점).
**검증 방식**: 사전 eval 세트를 스킵하고 Phase 1 앱 빌드 후 **실사용 기반으로 정확도 판정**. 사용자가 실제 한식 사진을 찍어보며 Top-3 적중·중량 오차·한상차림 분리 정확도를 체감 평가. 불만족 시 프롬프트 조정 → 모델 교체 → UX 보완 순으로 대응.
**트레이드오프**: 단일 벤더 락인 · 비결정성 · 사전 수치 근거 없이 Phase 1 진입 → 실측 후 ADR-002 재작성 필요할 수 있음.

---

### ADR-003: 백엔드는 Supabase
**결정**: Auth + Postgres + Storage를 Supabase 단일 벤더로.
**이유**: RLS로 사용자 격리를 DB 레벨에서 강제. Next.js와의 통합 좋고 무료 티어 MVP에 충분.
**트레이드오프**: 벤더 락인. Self-host 가능하나 초기 운영 불필요.

---

### ADR-004: 음식명 정규화는 `food_aliases` 테이블 경유
**결정**: LLM이 반환한 자유 문자열을 `meal_items`에 직접 저장하지 않고, `food_aliases(alias)` 조회 → `food_id`로 정규화.
**이유**:
- 동의어·표기 흔들림("김치찌개"/"김치찌게"/"묵은지김치찌개") 처리.
- 영양 수치는 `foods.kcal_per_100g` 등 정식 레코드에서만 읽어 신뢰도 보장.
- LLM은 `search_food(name)` tool로 후보 food_id를 받고 그 중 선택하게 함.
**트레이드오프**: 초기 alias 데이터 수집 필요 (Phase 0·2에서 점진 축적). 매칭 실패 시 fallback UX 필요 (사용자 직접 선택).
