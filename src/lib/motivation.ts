import type { GoalType } from "./calorie-targets";

type Context = {
  goal: GoalType | null;
  remaining: number | null;
  ratio: number | null;
  streak: number;
};

const GREET_CUT = [
  "가벼워지는 리듬, 잘 타고 있어요",
  "오늘의 절제가 내일의 선명함이에요",
  "조금 덜 먹는 용기, 멋져요",
  "루틴이 쌓일수록 몸이 가벼워질 거예요",
  "덜어내는 하루도 충분히 근사해요",
  "목표까지의 거리가 한 뼘 줄었어요",
];

const GREET_MAINTAIN = [
  "꾸준함이 곧 실력이에요",
  "오늘도 균형 잘 맞추고 있어요",
  "평온한 하루, 식단도 평화롭게",
  "잘 먹고 잘 쉬는 것도 운동이에요",
  "안정된 흐름, 계속 가볼까요",
  "매일의 밸런스, 귀엽게 지켜가요",
];

const GREET_BULK = [
  "한 끼 더 챙기는 부지런함, 멋져요",
  "잘 먹어야 잘 커요 💪",
  "오늘도 에너지 가득 채울 시간",
  "근육은 접시 위에서 자라요",
  "든든하게 먹고 든든하게 커요",
  "한 숟갈 더, 내일의 무게로",
];

const OVER_LINES = [
  "{n} kcal 넘었어도 괜찮아요, 내일이 있으니까",
  "오늘은 푸짐하게, 내일은 가볍게",
  "목표를 살짝 넘었어요. 충분히 잘했어요",
];

const CLOSE_LINES = [
  "목표까지 {n} kcal 남았어요",
  "{n} kcal만 더 챙기면 오늘의 선이에요",
  "살짝만 더 여유 있어요 · {n} kcal",
];

const STARTED_LINES = [
  "오늘의 첫 기록을 남겨볼까요 ✨",
  "예쁘게 시작해볼 시간이에요",
  "한 장 찍는 걸로 하루를 시작해요",
];

const STREAK_LINES = [
  "{n}일째 꾸준함, 멋진 페이스예요 🔥",
  "연속 {n}일. 습관이 되고 있어요",
  "{n}일 동안 놓지 않았어요, 대단해요",
];

function pick<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
}

function greetPool(goal: GoalType | null): string[] {
  if (goal === "cut") return GREET_CUT;
  if (goal === "bulk") return GREET_BULK;
  return GREET_MAINTAIN;
}

export function motivationLine(ctx: Context): string {
  const seed = daySeed() + Math.floor(Date.now() / (1000 * 60 * 60 * 3));

  if (ctx.streak >= 3 && seed % 3 === 0) {
    return pick(STREAK_LINES, seed).replace("{n}", String(ctx.streak));
  }

  if (ctx.remaining != null && ctx.ratio != null && ctx.ratio < 0.2) {
    return pick(STARTED_LINES, seed);
  }

  if (ctx.remaining != null && ctx.remaining < 0) {
    return pick(OVER_LINES, seed).replace("{n}", String(Math.abs(ctx.remaining)));
  }

  if (
    ctx.remaining != null &&
    ctx.ratio != null &&
    ctx.ratio >= 0.6 &&
    ctx.remaining > 0 &&
    ctx.remaining < 600
  ) {
    return pick(CLOSE_LINES, seed).replace("{n}", String(ctx.remaining));
  }

  return pick(greetPool(ctx.goal), seed);
}
