"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeTargets, type ActivityLevel, type GoalType, type Sex } from "@/lib/calorie-targets";
import { toast } from "sonner";

const ACTIVITIES: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "sedentary", label: "거의 안 움직여요", hint: "주 1회 이하 운동" },
  { value: "light", label: "가볍게 움직여요", hint: "주 1–3회 가벼운 운동" },
  { value: "moderate", label: "보통이에요", hint: "주 3–5회 운동" },
  { value: "active", label: "꽤 활동적이에요", hint: "주 6–7회 운동" },
  { value: "very_active", label: "매일 격하게", hint: "하드 트레이닝·육체 노동" },
];
const GOALS: { value: GoalType; label: string; emoji: string; hint: string }[] = [
  { value: "cut", label: "체중 감량", emoji: "🏃", hint: "매일 −500 kcal" },
  { value: "maintain", label: "체중 유지", emoji: "⚖️", hint: "TDEE 그대로" },
  { value: "bulk", label: "벌크업", emoji: "💪", hint: "매일 +300 kcal" },
];

const thisYear = new Date().getFullYear();

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  const [birthYear, setBirthYear] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const { profile } = await res.json();
        if (profile?.onboarded_at) {
          router.replace("/");
          return;
        }
        if (profile) {
          if (profile.sex) setSex(profile.sex);
          if (profile.birth_year) setBirthYear(String(profile.birth_year));
          if (profile.height_cm) setHeightCm(String(profile.height_cm));
          if (profile.current_weight_kg) setWeightKg(String(profile.current_weight_kg));
          if (profile.activity_level) setActivity(profile.activity_level);
          if (profile.goal_type) setGoal(profile.goal_type);
        }
      }
      setLoaded(true);
    })();
  }, [router]);

  const preview = useMemo(() => {
    const by = Number(birthYear);
    const hc = Number(heightCm);
    const wk = Number(weightKg);
    if (!sex || !by || !hc || !wk || !activity || !goal) return null;
    return computeTargets({
      sex,
      birthYear: by,
      heightCm: hc,
      weightKg: wk,
      activity,
      goal,
    });
  }, [sex, birthYear, heightCm, weightKg, activity, goal]);

  const canNextStep0 = !!sex && !!birthYear && Number(birthYear) >= 1900 && !!heightCm;
  const canNextStep1 = !!weightKg && !!activity;
  const canFinish = !!goal && !!preview;

  const finish = async () => {
    if (!preview || !sex || !activity || !goal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sex,
          birth_year: Number(birthYear),
          height_cm: Number(heightCm),
          current_weight_kg: Number(weightKg),
          activity_level: activity,
          goal_type: goal,
          goal_auto: true,
          finish_onboarding: true,
        }),
      });
      if (!res.ok) {
        toast.error("저장 실패");
        return;
      }
      if (weightKg) {
        void fetch("/api/weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight_kg: Number(weightKg) }),
        });
      }
      router.replace("/");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
          className="p-2 rounded-full hover:bg-brand-50 text-ink-500"
          aria-label="뒤로"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs text-ink-500 tabular-nums">{step + 1} / 3</span>
        <span className="w-9" aria-hidden />
      </header>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i <= step ? "bg-brand-500" : "bg-cream-100"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <section className="flex flex-col gap-5 pt-2">
          <div>
            <h1 className="text-2xl font-black italic tracking-[-0.04em]">안녕하세요 👋</h1>
            <p className="text-sm text-ink-500 mt-1">
              목표 칼로리를 계산하기 위해 기본 정보만 받을게요.
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-500">성별</span>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`py-3 rounded-2xl text-sm font-medium transition ${
                    sex === s
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-white ring-1 ring-brand-100 text-ink-700"
                  }`}
                >
                  {s === "male" ? "남성" : "여성"}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-500">출생 연도</span>
            <input
              type="number"
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder={`예: ${thisYear - 28}`}
              min={1900}
              max={thisYear}
              className="px-3 py-2.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-500">키 (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="예: 170"
              className="px-3 py-2.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
            />
          </label>

          <Button disabled={!canNextStep0} onClick={() => setStep(1)} className="mt-2">
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-5 pt-2">
          <div>
            <h1 className="text-2xl font-black italic tracking-[-0.04em]">활동량 선택</h1>
            <p className="text-sm text-ink-500 mt-1">평소 일상 기준으로 골라 주세요.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-500">현재 몸무게 (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="예: 65"
              className="px-3 py-2.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-500">활동량</span>
            {ACTIVITIES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setActivity(a.value)}
                className={`text-left px-4 py-3 rounded-2xl transition flex items-center justify-between ${
                  activity === a.value
                    ? "bg-brand-50 ring-2 ring-brand-400"
                    : "bg-white ring-1 ring-brand-100"
                }`}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{a.label}</span>
                  <span className="text-[11px] text-ink-500">{a.hint}</span>
                </span>
                {activity === a.value && (
                  <span className="text-brand-500 text-sm">✓</span>
                )}
              </button>
            ))}
          </div>

          <Button disabled={!canNextStep1} onClick={() => setStep(2)} className="mt-2">
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-5 pt-2">
          <div>
            <h1 className="text-2xl font-black italic tracking-[-0.04em]">목표 선택 🎯</h1>
            <p className="text-sm text-ink-500 mt-1">
              선택하면 하루 권장 칼로리를 계산해 드려요.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`flex flex-col items-center gap-1 py-4 rounded-2xl transition ${
                  goal === g.value
                    ? "bg-brand-50 ring-2 ring-brand-400"
                    : "bg-white ring-1 ring-brand-100"
                }`}
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-xs font-semibold">{g.label}</span>
                <span className="text-[10px] text-ink-500">{g.hint}</span>
              </button>
            ))}
          </div>

          {preview && (
            <div className="rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white p-5 shadow-lg flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <Sparkles className="w-3.5 h-3.5" />
                추천 하루 섭취량
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-black italic tabular-nums">
                  {preview.goalKcal}
                </span>
                <span className="text-sm text-white/85">kcal / 일</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-white/80">
                <span>BMR {preview.bmr} kcal</span>
                <span>TDEE {preview.tdee} kcal</span>
              </div>
              <p className="text-[10px] text-white/70 pt-1">
                Mifflin-St Jeor 공식 · 나중에 설정에서 수정할 수 있어요
              </p>
            </div>
          )}

          <Button disabled={!canFinish || saving} onClick={finish} className="mt-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "시작하기"}
          </Button>
        </section>
      )}
    </main>
  );
}
