import { describe, it, expect } from "vitest";
import { computeTargets } from "./calorie-targets";

const today = new Date(2026, 3, 22);

describe("computeTargets", () => {
  it("남성 moderate maintain (Mifflin-St Jeor 기준)", () => {
    // 30세 남 · 180cm · 80kg · moderate · maintain
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    const r = computeTargets({
      sex: "male",
      birthYear: 1996,
      heightCm: 180,
      weightKg: 80,
      activity: "moderate",
      goal: "maintain",
      today,
    });
    expect(r.bmr).toBe(1780);
    expect(r.tdee).toBe(2759);
    expect(r.goalKcal).toBe(2759);
  });

  it("여성 sedentary cut — TDEE − 500 적용, BMR × 1.1 하한 넘음", () => {
    // 28세 여 · 165cm · 60kg · sedentary
    // BMR = 10*60 + 6.25*165 - 5*28 - 161 = 1330.25 → 1330
    // TDEE = 1330 * 1.2 = 1596
    // cut = 1596 - 500 = 1096, 하한 = 1330 * 1.1 = 1463 → 1463 승
    const r = computeTargets({
      sex: "female",
      birthYear: 1998,
      heightCm: 165,
      weightKg: 60,
      activity: "sedentary",
      goal: "cut",
      today,
    });
    expect(r.bmr).toBe(1330);
    expect(r.tdee).toBe(1596);
    expect(r.goalKcal).toBe(1463);
  });

  it("남성 very_active bulk — TDEE + 300", () => {
    const r = computeTargets({
      sex: "male",
      birthYear: 2000,
      heightCm: 175,
      weightKg: 70,
      activity: "very_active",
      goal: "bulk",
      today,
    });
    // BMR = 700 + 1093.75 - 130 + 5 = 1668.75 → 1669
    expect(r.bmr).toBe(1669);
    expect(r.tdee).toBe(Math.round(1669 * 1.9));
    expect(r.goalKcal).toBe(Math.round(1669 * 1.9) + 300);
  });

  it("활동 계수 5단계 모두 TDEE가 BMR보다 크다", () => {
    const levels: Array<
      "sedentary" | "light" | "moderate" | "active" | "very_active"
    > = ["sedentary", "light", "moderate", "active", "very_active"];
    let prevTdee = 0;
    for (const activity of levels) {
      const r = computeTargets({
        sex: "male",
        birthYear: 1990,
        heightCm: 170,
        weightKg: 70,
        activity,
        goal: "maintain",
        today,
      });
      expect(r.tdee).toBeGreaterThan(r.bmr);
      expect(r.tdee).toBeGreaterThan(prevTdee);
      prevTdee = r.tdee;
    }
  });

  it("cut 하한: 극저 TDEE 케이스에서 BMR × 1.1 유지", () => {
    const r = computeTargets({
      sex: "female",
      birthYear: 1960,
      heightCm: 150,
      weightKg: 45,
      activity: "sedentary",
      goal: "cut",
      today,
    });
    expect(r.goalKcal).toBeGreaterThanOrEqual(Math.round(r.bmr * 1.1));
  });
});
