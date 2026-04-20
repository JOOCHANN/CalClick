# UI 디자인 가이드

## 디자인 원칙
1. **도구**로 보여야 한다. 매일 쓰는 대시보드. 마케팅 페이지 아님.
2. **숫자가 주인공**. 칼로리·중량·탄단지가 명확히 읽혀야 한다. 숫자는 tabular-nums.
3. **편집 가능성을 숨기지 않는다**. 인식 결과는 반드시 수정 가능 UI와 함께.

## AI 슬롭 안티패턴 — 금지
| 금지 | 이유 |
|---|---|
| backdrop-filter: blur() (glass morphism) | AI 템플릿의 가장 흔한 징후 |
| 배경 그라데이션 텍스트 | AI SaaS 랜딩 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = 슬롭 |
| 보라/인디고 브랜드 컬러 | "AI = 보라" 클리셰 |
| 모든 카드가 동일 rounded-2xl | 템플릿 느낌 |
| 배경 gradient orb | 모든 AI 랜딩에 있는 장식 |

## 색상

### 포인트
- `#16a34a` (green-600) — 건강·긍정. 유일한 브랜드 컬러.

### 배경 (라이트 / 다크)
| 용도 | 라이트 | 다크 |
|---|---|---|
| 페이지 | `#fafafa` | `#0a0a0a` |
| 카드 | `#ffffff` | `#141414` |
| 보더 | `neutral-200` | `neutral-800` |

### 텍스트
| 용도 | 라이트 | 다크 |
|---|---|---|
| 주 | `text-neutral-900` | `text-white` |
| 본문 | `text-neutral-700` | `text-neutral-300` |
| 보조 | `text-neutral-500` | `text-neutral-400` |
| 비활성 | `text-neutral-400` | `text-neutral-500` |

### 시맨틱
| 용도 | 값 |
|---|---|
| 목표 달성 | `#16a34a` |
| 초과/경고 | `#ef4444` |
| 중립 | `#525252` |

## 컴포넌트

### 카드
```
rounded-lg bg-white dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800 p-4
```

### 버튼
```
Primary: rounded-lg bg-green-600 text-white hover:bg-green-700 px-4 py-2
Secondary: rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2
Text: text-neutral-500 hover:text-neutral-900 dark:hover:text-white
```

### 입력
```
rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-2
```

### 중량 슬라이더
- shadcn `Slider` 기반. 50g 단위 스냅, 값 tabular-nums 표시.

## 레이아웃
- 모바일 우선. `max-w-md` (448px) 기본, 데스크톱은 `max-w-2xl` 까지.
- 좌측 정렬 기본. 숫자 대시보드는 중앙 게이지 허용 (오늘 kcal 링).
- 섹션 간 `space-y-6`, 카드 내부 `space-y-3`.

## 타이포그래피
- 한국어: Pretendard Variable
- 숫자: Pretendard + `tabular-nums`

| 용도 | 스타일 |
|---|---|
| 페이지 제목 | `text-2xl font-semibold` |
| 카드 제목 | `text-sm font-medium text-neutral-500` |
| 본문 | `text-sm` |
| 대시보드 숫자 | `text-5xl font-semibold tabular-nums` |

## 애니메이션
- 허용: `fade-in` 0.2s, `slide-up` 0.3s (결과 카드 등장).
- 그 외 모든 애니메이션 금지.

## 아이콘
- lucide-react · `strokeWidth={1.5}` · 아이콘 컨테이너(둥근 배경) 금지.
