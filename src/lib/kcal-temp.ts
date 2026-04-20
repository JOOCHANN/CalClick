// TEMP_PHASE_1: 하드코딩 kcal. Phase 2에서 식약처 DB로 교체.
const MAP: Record<string, number> = {
  "김치찌개": 62,
  "된장찌개": 55,
  "비빔밥": 160,
  "불고기": 190,
  "김밥": 120,
  "라면": 110,
  "떡볶이": 160,
  "제육볶음": 180,
  "삼겹살": 280,
  "공깃밥": 168,
  "쌀밥": 168,
  "미역국": 40,
  "계란찜": 110,
};

const DEFAULT_KCAL_PER_100G = 150;

export function kcalFor(name: string, grams: number): number {
  const per100 = MAP[name.trim()] ?? DEFAULT_KCAL_PER_100G;
  return Math.round((per100 * grams) / 100);
}
