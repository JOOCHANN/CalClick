export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "cut" | "maintain" | "bulk";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TargetInput {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
  today?: Date;
}

export interface TargetResult {
  bmr: number;
  tdee: number;
  goalKcal: number;
}

export function computeTargets(input: TargetInput): TargetResult {
  const now = input.today ?? new Date();
  const age = Math.max(10, now.getFullYear() - input.birthYear);
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * age;
  const bmrRaw = input.sex === "male" ? base + 5 : base - 161;
  const bmr = Math.round(bmrRaw);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[input.activity]);

  let goalKcal: number;
  if (input.goal === "cut") {
    goalKcal = Math.max(Math.round(bmr * 1.1), tdee - 500);
  } else if (input.goal === "bulk") {
    goalKcal = tdee + 300;
  } else {
    goalKcal = tdee;
  }
  return { bmr, tdee, goalKcal };
}
