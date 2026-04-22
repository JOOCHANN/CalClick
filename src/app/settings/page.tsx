"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  computeTargets,
  type ActivityLevel,
  type GoalType,
  type Sex,
} from "@/lib/calorie-targets";

type Profile = {
  nickname: string | null;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  goal_kcal: number | null;
  goal_auto: boolean;
  onboarded_at: string | null;
};

const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "거의 안 움직임",
  light: "가볍게",
  moderate: "보통",
  active: "꽤 활동적",
  very_active: "매우 활동적",
};
const GOAL_LABEL: Record<GoalType, string> = {
  cut: "체중 감량",
  maintain: "체중 유지",
  bulk: "벌크업",
};

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goalAuto, setGoalAuto] = useState(true);
  const [goalKcal, setGoalKcal] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/profile");
      if (res.ok && !cancelled) {
        const { profile: p } = (await res.json()) as { profile: Profile | null };
        setProfile(p);
        if (p) {
          setNickname(p.nickname ?? "");
          setGoalType(p.goal_type);
          setActivity(p.activity_level);
          setGoalAuto(p.goal_auto);
          setGoalKcal(p.goal_kcal ? String(p.goal_kcal) : "");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const autoPreview = (() => {
    if (
      !profile?.sex ||
      !profile.birth_year ||
      !profile.height_cm ||
      !profile.current_weight_kg ||
      !activity ||
      !goalType
    )
      return null;
    return computeTargets({
      sex: profile.sex,
      birthYear: profile.birth_year,
      heightCm: Number(profile.height_cm),
      weightKg: Number(profile.current_weight_kg),
      activity,
      goal: goalType,
    });
  })();

  const saveGoal = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        activity_level: activity,
        goal_type: goalType,
        goal_auto: goalAuto,
      };
      if (!goalAuto) {
        const n = Math.round(Number(goalKcal));
        if (!Number.isFinite(n) || n < 800 || n > 6000) {
          toast.error("목표는 800–6000 사이로 입력해 주세요");
          return;
        }
        body.goal_kcal = n;
      }
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("저장 실패");
        return;
      }
      const data = (await res.json()) as { applied: { goal_kcal?: number } };
      if (data.applied?.goal_kcal) setGoalKcal(String(data.applied.goal_kcal));
      toast.success("저장됨");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "삭제 실패");
      setDeleting(false);
      return;
    }
    location.href = "/login";
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">설정</h1>
        <Link href="/" className="text-xs text-neutral-500 underline">
          홈
        </Link>
      </header>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-2xl bg-white ring-1 ring-brand-100/60 p-4">
            <h2 className="text-sm font-semibold">닉네임</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="예: 민수"
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm"
              />
              <button
                type="button"
                disabled={
                  nicknameSaving ||
                  nickname.trim().length === 0 ||
                  nickname.trim() === (profile?.nickname ?? "")
                }
                onClick={async () => {
                  setNicknameSaving(true);
                  try {
                    const res = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ nickname: nickname.trim() }),
                    });
                    if (!res.ok) {
                      toast.error("저장 실패");
                      return;
                    }
                    setProfile((p) => (p ? { ...p, nickname: nickname.trim() } : p));
                    toast.success("저장됨");
                  } finally {
                    setNicknameSaving(false);
                  }
                }}
                className="px-4 py-2 text-xs rounded-xl bg-brand-500 text-white font-bold disabled:opacity-40"
              >
                {nicknameSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-white ring-1 ring-brand-100/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">내 정보</h2>
              {!profile?.onboarded_at && (
                <Link
                  href="/onboarding"
                  className="text-[11px] text-brand-600 font-medium underline"
                >
                  입력하기
                </Link>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-ink-500">성별</dt>
              <dd className="text-right">
                {profile?.sex === "male"
                  ? "남성"
                  : profile?.sex === "female"
                    ? "여성"
                    : "—"}
              </dd>
              <dt className="text-ink-500">출생 연도</dt>
              <dd className="text-right tabular-nums">{profile?.birth_year ?? "—"}</dd>
              <dt className="text-ink-500">키</dt>
              <dd className="text-right tabular-nums">
                {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
              </dd>
              <dt className="text-ink-500">몸무게</dt>
              <dd className="text-right tabular-nums">
                {profile?.current_weight_kg ? `${profile.current_weight_kg} kg` : "—"}
              </dd>
            </dl>
            <Link
              href="/onboarding"
              className="text-[11px] text-brand-600 underline self-start"
            >
              신체 정보 수정 →
            </Link>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl bg-white ring-1 ring-brand-100/60 p-4">
            <h2 className="text-sm font-semibold">목표</h2>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-500">활동량</span>
              <div className="grid grid-cols-5 gap-1">
                {(Object.keys(ACTIVITY_LABEL) as ActivityLevel[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setActivity(a)}
                    className={`text-[10px] py-2 rounded-lg transition ${
                      activity === a
                        ? "bg-brand-500 text-white font-bold"
                        : "bg-cream-50 text-ink-500 ring-1 ring-brand-100"
                    }`}
                  >
                    {ACTIVITY_LABEL[a]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-ink-500">목표 방향</span>
              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoalType(g)}
                    className={`text-xs py-2 rounded-lg transition ${
                      goalType === g
                        ? "bg-brand-500 text-white font-bold"
                        : "bg-cream-50 text-ink-500 ring-1 ring-brand-100"
                    }`}
                  >
                    {GOAL_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-500">하루 칼로리</span>
                <label className="text-[11px] flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={goalAuto}
                    onChange={(e) => setGoalAuto(e.target.checked)}
                    className="accent-brand-500"
                  />
                  <span className="text-ink-500">자동 계산</span>
                </label>
              </div>
              {goalAuto ? (
                <div className="rounded-xl bg-brand-50 px-3 py-3 flex items-center justify-between">
                  <span className="text-[11px] text-brand-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    자동
                  </span>
                  <span className="text-xl font-black italic tabular-nums text-brand-700">
                    {autoPreview?.goalKcal ?? profile?.goal_kcal ?? "—"}
                    <span className="text-[10px] text-brand-600 ml-1">kcal</span>
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goalKcal}
                    onChange={(e) => setGoalKcal(e.target.value)}
                    placeholder="예: 2200"
                    className="w-full px-3 py-2.5 pr-14 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                    kcal
                  </span>
                </div>
              )}
            </div>

            <Button onClick={saveGoal} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </section>
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-700">개인정보</h2>
        <Link href="/privacy" className="text-sm text-green-600 underline">
          개인정보 처리방침
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-red-200 p-4">
        <h2 className="text-sm font-medium text-red-600">계정 삭제</h2>
        <p className="text-xs text-neutral-500">
          계정과 모든 식사 기록·사진이 즉시 영구 삭제됩니다. 복구할 수 없습니다.
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중…" : "영구 삭제"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-red-300 text-red-600"
            onClick={() => setConfirming(true)}
          >
            계정 삭제
          </Button>
        )}
      </section>

      <Toaster position="top-center" />
    </main>
  );
}
