# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── (auth)/login/
│   ├── (app)/
│   │   ├── page.tsx              # 홈 (오늘 대시보드)
│   │   ├── capture/              # 촬영/업로드/결과
│   │   ├── diary/[date]/         # 날짜별 식단
│   │   ├── goals/                # 목표/건강
│   │   └── stats/                # 주/월 그래프
│   └── api/
│       ├── recognize/route.ts    # 이미지 → Vision LLM → 후보 음식
│       ├── food/search/route.ts  # 음식명 → food_id (식약처/캐시)
│       ├── meals/route.ts        # meals CRUD
│       └── goals/route.ts
├── components/   # shadcn 래퍼 + 도메인 컴포넌트
├── services/     # openai.ts, supabase.ts, mfds.ts, rda.ts
├── lib/          # calc-bmr.ts, image-resize.ts, kcal-aggregate.ts
└── types/
```

## 데이터 모델 (Supabase Postgres)
- `profiles(id FK auth.users, height_cm, weight_kg, sex, birth, activity_level, goal_kcal)`
- `meals(id, user_id, eaten_at, meal_type[breakfast|lunch|dinner|snack], photo_path, total_kcal, note, share_count)`
- `meal_items(id, meal_id, food_id FK, grams, kcal, carb_g, protein_g, fat_g, source[mfds|rda|llm])`
- `foods(food_id PK, official_name, kcal_per_100g, carb/protein/fat_per_100g, source)`
- `food_aliases(alias PK, food_id FK)` — LLM 출력 문자열 → 정식 food_id 정규화

**RLS**: `profiles`, `meals`, `meal_items`는 `user_id = auth.uid()`. `foods`, `food_aliases`는 read-only public.

## 데이터 흐름
```
[촬영/업로드]
  ↓ (Client: 이미지 1024px 리사이즈)
[/api/recognize]
  ↓ Vision LLM (tool-use: search_food(name))
  ↓ → food_id 배열 + grams 추정 + confidence
[결과 UI] (사용자 수정: 음식명/중량/공유 인원)
  ↓
[/api/meals POST]
  ↓
[Supabase] (meals + meal_items INSERT)
  ↓
[홈 대시보드] (오늘 합계 재계산)
```

## 패턴
- Server Components 기본. 인터랙션(촬영 preview · 슬라이더 · 폼 · 차트)만 Client.
- 외부 API 래퍼(`services/`)는 API 라우트에서만 import. 클라이언트 번들에서 분리.
- LLM은 `search_food(query: string): {food_id, confidence}[]`를 tool로 호출 → 자유 문자열 제거.

## 상태 관리
- 서버 상태: Server Components + `revalidatePath`
- 클라이언트 상태: `useState`/`useReducer`. 전역 스토어 불필요 (MVP 범위).
- 폼: `react-hook-form` + `zod`.
