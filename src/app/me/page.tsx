"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Flame,
  Calendar as CalendarIcon,
  Info,
  Loader2,
  Pencil,
  Scale,
} from "lucide-react";
import { foodEmoji, displayFoodName } from "@/lib/food-emoji";
import { motivationLine } from "@/lib/motivation";
import type { GoalType } from "@/lib/calorie-targets";

type Day = { date: string; total_kcal: number };
type Monthly = {
  months: { month: string; avg_kcal: number; active_days: number }[];
};
type Profile = {
  nickname: string | null;
  goal_kcal: number | null;
  goal_type: GoalType | null;
  onboarded_at: string | null;
};
type Stats = {
  month: string;
  days: Day[];
  total_kcal: number;
  avg_kcal: number;
  active_days: number;
};
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type DayItem = {
  id: string;
  name: string;
  grams: number;
  kcal: number;
  emoji: string | null;
  source: "db" | "llm";
  food_id: string | null;
  kcal_per_100g: number | null;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  food_source: string | null;
};
type DayMeal = {
  id: string;
  eaten_at: string;
  meal_type: MealType | null;
  total_kcal: number;
  share_count: number;
  has_photo: boolean;
  note: string | null;
  items: DayItem[];
};
type DayDetail = { total_kcal: number; meals: DayMeal[] };

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍪",
};
const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-cream-100 text-amber-700",
  lunch: "bg-mint-100 text-mint-600",
  dinner: "bg-[#EEE6FF] text-[#6B4FCF]",
  snack: "bg-brand-100 text-brand-700",
};

function formatMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonthLabel(d: Date): string {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const week = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${m}월 ${d}일 (${week})`;
}
function dayRange(dateStr: string): { from: string; to: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
function weekStartOf(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - dt.getDay());
  return dt;
}

export default function MePage() {
  const today = new Date();
  const todayKey = toDateKey(today);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [calendarView, setCalendarView] = useState<"month" | "week" | "graph">("month");
  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(todayKey));
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhoto, setLoadingPhoto] = useState<Record<string, boolean>>({});
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [noteEditing, setNoteEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [weightLogs, setWeightLogs] = useState<
    { logged_on: string; weight_kg: number }[]
  >([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightEditing, setWeightEditing] = useState(false);
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const weightByDate = new Map(weightLogs.map((l) => [l.logged_on, l.weight_kg]));

  const loadPhoto = useCallback(async (mealId: string) => {
    setLoadingPhoto((prev) => ({ ...prev, [mealId]: true }));
    try {
      const res = await fetch(`/api/meals/${mealId}/photo`);
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      setPhotoUrls((prev) => ({ ...prev, [mealId]: url }));
    } finally {
      setLoadingPhoto((prev) => ({ ...prev, [mealId]: false }));
    }
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch(`/api/stats/daily?month=${formatMonthKey(cursor)}`);
    if (!res.ok) return;
    setStats(await res.json());
  }, [cursor]);

  const loadDay = useCallback(async (date: string) => {
    setLoadingDay(true);
    try {
      const { from, to } = dayRange(date);
      const res = await fetch(
        `/api/meals/today?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      if (!res.ok) return;
      setDayDetail(await res.json());
    } finally {
      setLoadingDay(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();
  }, [loadStats]);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weight?days=180");
    if (!res.ok) return;
    const data = (await res.json()) as {
      logs: { logged_on: string; weight_kg: number }[];
    };
    setWeightLogs(data.logs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/weight?days=180");
      if (!res.ok) return;
      const data = (await res.json()) as {
        logs: { logged_on: string; weight_kg: number }[];
      };
      if (!cancelled) setWeightLogs(data.logs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [mRes, pRes] = await Promise.all([
        fetch("/api/stats/monthly?n=6"),
        fetch("/api/profile"),
      ]);
      if (mRes.ok && !cancelled) setMonthly(await mRes.json());
      if (pRes.ok && !cancelled) {
        const { profile } = (await pRes.json()) as { profile: Profile | null };
        setProfile(profile);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedWeight = selectedDate ? weightByDate.get(selectedDate) ?? null : null;

  const saveWeight = async () => {
    if (!selectedDate) return;
    const n = Number(weightInput);
    if (!Number.isFinite(n) || n < 20 || n > 400) return;
    setWeightSaving(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: n, logged_on: selectedDate }),
      });
      if (!res.ok) return;
      setWeightEditing(false);
      setWeightInput("");
      void loadWeights();
    } finally {
      setWeightSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDayDetail(null);
      return;
    }
    void loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  useEffect(() => {
    setWeightEditing(false);
    setWeightInput("");
  }, [selectedDate]);

  useEffect(() => {
    if (!dayDetail) return;
    dayDetail.meals.forEach((m) => {
      if (m.has_photo && !photoUrls[m.id] && !loadingPhoto[m.id]) {
        void loadPhoto(m.id);
      }
    });
  }, [dayDetail, photoUrls, loadingPhoto, loadPhoto]);

  useEffect(() => {
    if (!modalUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalUrl]);

  const monthLabel = formatMonthLabel(cursor);
  const maxKcal = Math.max(1, ...(stats?.days.map((d) => d.total_kcal) ?? [1]));
  const firstDow = stats?.days[0] ? dayOfWeek(stats.days[0].date) : 0;

  const streak = (() => {
    if (!stats) return 0;
    const todayIdx = stats.days.findIndex((d) => d.date === todayKey);
    if (todayIdx < 0) return 0;
    let count = 0;
    for (let i = todayIdx; i >= 0; i--) {
      if (stats.days[i].total_kcal > 0) count++;
      else if (i !== todayIdx) break;
      else continue;
    }
    return count;
  })();

  const todayEntry = stats?.days.find((d) => d.date === todayKey);
  const todayKcal = todayEntry?.total_kcal ?? 0;
  const goalKcal = profile?.goal_kcal ?? null;
  const remaining = goalKcal ? goalKcal - todayKcal : null;
  const ratio = goalKcal ? todayKcal / goalKcal : null;
  const nick = profile?.nickname?.trim() || "오늘";
  const motiv = motivationLine({
    goal: profile?.goal_type ?? null,
    remaining,
    ratio,
    streak,
  });

  const weekDays: Day[] = (() => {
    const result: Day[] = [];
    const byDate = new Map(stats?.days.map((d) => [d.date, d.total_kcal]) ?? []);
    for (let i = 0; i < 7; i++) {
      const dt = new Date(weekStart);
      dt.setDate(weekStart.getDate() + i);
      const key = toDateKey(dt);
      result.push({ date: key, total_kcal: byDate.get(key) ?? 0 });
    }
    return result;
  })();

  const saveNote = async (mealId: string) => {
    setNoteSaving(true);
    try {
      const value = noteDraft.trim();
      const res = await fetch(`/api/meals/${mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: value.length === 0 ? null : value }),
      });
      if (!res.ok) return;
      setDayDetail((prev) =>
        prev
          ? {
              ...prev,
              meals: prev.meals.map((m) =>
                m.id === mealId ? { ...m, note: value.length === 0 ? null : value } : m,
              ),
            }
          : prev,
      );
      setNoteEditing(null);
      setNoteDraft("");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const weekRangeLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getMonth() + 1}.${weekStart.getDate()} – ${end.getMonth() + 1}.${end.getDate()}`;
  })();

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="CalClick"
            className="w-10 h-10 rounded-2xl shadow-[0_6px_16px_-4px_rgba(255,138,149,0.4)] shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-black italic tracking-[-0.04em] leading-none truncate">
              <span className="bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
                {nick}
              </span>
              <span className="text-ink-900">님</span>
            </h1>
            <p className="text-[11px] text-ink-500 mt-1 leading-snug line-clamp-2">
              {motiv}
            </p>
          </div>
        </div>
        {streak > 0 && (
          <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full flex items-center gap-1 ring-1 ring-brand-100 shrink-0">
            🔥 {streak}일째
          </span>
        )}
      </header>

      {/* 월 요약 카드 */}
      <section className="relative rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white p-4 shadow-[0_12px_32px_-8px_rgba(255,138,149,0.45)] overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl" aria-hidden />
        <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl" aria-hidden />
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-1.5 rounded-full hover:bg-white/10"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-1.5 rounded-full hover:bg-white/10"
            aria-label="다음 달"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-white/70">합계</div>
            <div className="text-lg font-semibold tabular-nums">{stats?.total_kcal ?? 0}</div>
            <div className="text-[9px] text-white/60">kcal</div>
          </div>
          <div className="border-x border-white/20">
            <div className="text-[10px] text-white/70">일 평균</div>
            <div className="text-lg font-semibold tabular-nums">{stats?.avg_kcal ?? 0}</div>
            <div className="text-[9px] text-white/60">kcal</div>
          </div>
          <div>
            <div className="text-[10px] text-white/70">기록 일수</div>
            <div className="text-lg font-semibold tabular-nums">{stats?.active_days ?? 0}</div>
            <div className="text-[9px] text-white/60">일</div>
          </div>
        </div>
      </section>

      {/* 달력 (월/주/그래프 토글) */}
      <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex bg-cream-50 rounded-full p-0.5 ring-1 ring-brand-100/50 text-xs">
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={`px-3 py-1 rounded-full transition ${
                calendarView === "month"
                  ? "bg-brand-500 text-white font-bold shadow-sm"
                  : "text-ink-500"
              }`}
            >
              월
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedDate) setWeekStart(weekStartOf(selectedDate));
                setCalendarView("week");
              }}
              className={`px-3 py-1 rounded-full transition ${
                calendarView === "week"
                  ? "bg-brand-500 text-white font-bold shadow-sm"
                  : "text-ink-500"
              }`}
            >
              주
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("graph")}
              className={`px-3 py-1 rounded-full transition ${
                calendarView === "graph"
                  ? "bg-brand-500 text-white font-bold shadow-sm"
                  : "text-ink-500"
              }`}
            >
              그래프
            </button>
          </div>
          {calendarView === "week" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(weekStart);
                  prev.setDate(weekStart.getDate() - 7);
                  setWeekStart(prev);
                }}
                className="p-1 rounded-full text-ink-500 hover:bg-brand-50"
                aria-label="이전 주"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs tabular-nums text-ink-700">{weekRangeLabel}</span>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(weekStart);
                  next.setDate(weekStart.getDate() + 7);
                  if (toDateKey(next) > todayKey) return;
                  setWeekStart(next);
                }}
                disabled={(() => {
                  const next = new Date(weekStart);
                  next.setDate(weekStart.getDate() + 7);
                  return toDateKey(next) > todayKey;
                })()}
                className="p-1 rounded-full text-ink-500 hover:bg-brand-50 disabled:opacity-30"
                aria-label="다음 주"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {calendarView !== "graph" && (
          <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-neutral-400 text-center">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <span key={d} className={i === 0 ? "text-brand-400" : i === 6 ? "text-mint-600" : ""}>
                {d}
              </span>
            ))}
          </div>
        )}

        {calendarView === "month" ? (
          <div className="grid grid-cols-7 gap-1">
            {!stats &&
              Array.from({ length: 35 }).map((_, i) => (
                <span
                  key={`sk-${i}`}
                  className="aspect-square rounded-2xl bg-cream-100 animate-pulse"
                />
              ))}
            {Array.from({ length: firstDow }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {stats?.days.map((d) => {
              const intensity = d.total_kcal / maxKcal;
              const has = d.total_kcal > 0;
              const bg = !has
                ? "bg-cream-50 text-ink-500"
                : intensity < 0.33
                  ? "bg-brand-100 text-brand-700"
                  : intensity < 0.66
                    ? "bg-brand-300 text-white"
                    : "bg-brand-500 text-white";
              const isToday = d.date === todayKey;
              const isSelected = d.date === selectedDate;
              const day = Number(d.date.slice(-2));
              const w = weightByDate.get(d.date);
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => handleSelect(d.date)}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 transition ${bg} ${
                    isSelected
                      ? "ring-2 ring-brand-600 scale-105 shadow-md"
                      : isToday
                        ? "ring-1 ring-brand-500"
                        : "hover:ring-1 hover:ring-brand-200"
                  }`}
                >
                  <span className="absolute top-1 left-1.5 text-[8px] tabular-nums opacity-55 leading-none">
                    {day}
                  </span>
                  {has ? (
                    <span className="flex items-baseline gap-0.5 leading-none">
                      <span className="text-[11px] font-bold tabular-nums">{d.total_kcal}</span>
                      <span className="text-[7px] opacity-70">kcal</span>
                    </span>
                  ) : (
                    <span className="text-[9px] opacity-30 leading-none">–</span>
                  )}
                  {w != null && (
                    <span className="flex items-baseline gap-0.5 leading-none">
                      <span className="text-[9px] tabular-nums opacity-85">{w}</span>
                      <span className="text-[7px] opacity-60">kg</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : calendarView === "week" ? (
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const weekMax = Math.max(1, ...weekDays.map((x) => x.total_kcal));
              const intensity = d.total_kcal / weekMax;
              const has = d.total_kcal > 0;
              const bg = !has
                ? "bg-cream-50 text-ink-500"
                : intensity < 0.33
                  ? "bg-brand-100 text-brand-700"
                  : intensity < 0.66
                    ? "bg-brand-300 text-white"
                    : "bg-brand-500 text-white";
              const isToday = d.date === todayKey;
              const isSelected = d.date === selectedDate;
              const w = weightByDate.get(d.date);
              const [, mm, dd] = d.date.split("-");
              const isFuture = d.date > todayKey;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    const [y, m] = d.date.split("-").map(Number);
                    if (m - 1 !== cursor.getMonth() || y !== cursor.getFullYear()) {
                      setCursor(new Date(y, m - 1, 1));
                    }
                    handleSelect(d.date);
                  }}
                  className={`relative aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-1 transition ${bg} ${
                    isFuture ? "opacity-30" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-brand-600 scale-[1.03] shadow-md"
                      : isToday
                        ? "ring-1 ring-brand-500"
                        : "hover:ring-1 hover:ring-brand-200"
                  }`}
                >
                  <span className="absolute top-1 left-1.5 text-[9px] opacity-55 leading-none tabular-nums">
                    {Number(mm)}/{Number(dd)}
                  </span>
                  {has ? (
                    <span className="flex items-baseline gap-0.5 leading-none mt-1">
                      <span className="text-sm font-bold tabular-nums">{d.total_kcal}</span>
                      <span className="text-[8px] opacity-70">kcal</span>
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-30 leading-none mt-1">–</span>
                  )}
                  {w != null && (
                    <span className="flex items-baseline gap-0.5 leading-none">
                      <span className="text-[10px] tabular-nums opacity-85">{w}</span>
                      <span className="text-[8px] opacity-60">kg</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          (() => {
            const months = monthly?.months ?? [];
            const monthlyWeight = new Map<string, number>();
            for (const m of months) {
              const [y, mm] = m.month.split("-").map(Number);
              const start = new Date(y, mm - 1, 1);
              const end = new Date(y, mm, 0);
              const inMonth = weightLogs.filter(
                (l) => l.logged_on >= toDateKey(start) && l.logged_on <= toDateKey(end),
              );
              if (inMonth.length > 0) {
                const avg = inMonth.reduce((s, x) => s + x.weight_kg, 0) / inMonth.length;
                monthlyWeight.set(m.month, Math.round(avg * 10) / 10);
              }
            }
            const hasAnyKcal = months.some((m) => m.avg_kcal > 0);
            const hasAnyWeight = monthlyWeight.size > 0;
            if (!hasAnyKcal && !hasAnyWeight) {
              return (
                <p className="text-center text-xs text-ink-500 py-10">
                  아직 기록이 쌓이면 여기에 그래프가 나타나요 📈
                </p>
              );
            }
            const goal = profile?.goal_kcal ?? 0;
            const kcalMax = Math.max(goal, ...months.map((m) => m.avg_kcal), 1);
            const weightVals = Array.from(monthlyWeight.values());
            const wMin = weightVals.length > 0 ? Math.min(...weightVals) : 0;
            const wMax = weightVals.length > 0 ? Math.max(...weightVals) : 1;
            const wRange = Math.max(0.5, wMax - wMin);
            const chartH = 140;
            const w = 300;
            const padL = 4;
            const padR = 4;
            const bw = (w - padL - padR) / months.length;
            const wxy = months
              .map((m, i) => {
                const v = monthlyWeight.get(m.month);
                if (v == null) return null;
                const x = padL + bw * (i + 0.5);
                const y = chartH - ((v - wMin) / wRange) * (chartH - 20) - 10;
                return { x, y, v, month: m.month };
              })
              .filter((p): p is { x: number; y: number; v: number; month: string } => p !== null);
            const linePts = wxy.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
            return (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-ink-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-brand-600 to-brand-400" />
                    칼로리 (일 평균)
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-500">
                    <span className="w-3 h-0.5 bg-mint-600" />
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-600 -ml-1" />
                    체중 (월 평균)
                  </span>
                </div>
                <div className="relative">
                  <svg
                    viewBox={`0 0 ${w} ${chartH}`}
                    className="w-full h-36"
                    preserveAspectRatio="none"
                  >
                    {goal > 0 && (
                      <line
                        x1={0}
                        x2={w}
                        y1={chartH - (goal / kcalMax) * chartH}
                        y2={chartH - (goal / kcalMax) * chartH}
                        stroke="#FFB8C0"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {months.map((m, i) => {
                      const h =
                        m.avg_kcal === 0 ? 2 : Math.max(8, (m.avg_kcal / kcalMax) * chartH);
                      const x = padL + bw * i + bw * 0.2;
                      const bwInner = bw * 0.6;
                      const y = chartH - h;
                      const over = goal > 0 && m.avg_kcal > goal;
                      return (
                        <rect
                          key={m.month}
                          x={x}
                          y={y}
                          width={bwInner}
                          height={h}
                          rx={4}
                          fill={
                            m.avg_kcal === 0
                              ? "#FFF5F2"
                              : over
                                ? "url(#barOver)"
                                : "url(#barNorm)"
                          }
                        />
                      );
                    })}
                    {linePts && (
                      <polyline
                        points={linePts}
                        fill="none"
                        stroke="#4CAF8A"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    {wxy.map((p) => (
                      <circle
                        key={p.month}
                        cx={p.x}
                        cy={p.y}
                        r={3}
                        fill="#fff"
                        stroke="#4CAF8A"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    <defs>
                      <linearGradient id="barNorm" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stopColor="#FFB8C0" />
                        <stop offset="1" stopColor="#FFD1D8" />
                      </linearGradient>
                      <linearGradient id="barOver" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stopColor="#EE5363" />
                        <stop offset="1" stopColor="#FF8A95" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-ink-500 tabular-nums -mt-1">
                  {months.map((m) => {
                    const [, mm] = m.month.split("-");
                    const kcal = m.avg_kcal > 0 ? m.avg_kcal : null;
                    const wv = monthlyWeight.get(m.month);
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="font-medium text-ink-700">{Number(mm)}월</span>
                        {kcal != null && (
                          <span className="text-brand-600 font-bold">{kcal} kcal</span>
                        )}
                        {wv != null && (
                          <span className="text-mint-600 font-bold">{wv} kg</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {goal > 0 && (
                  <p className="text-[10px] text-ink-500 text-right -mt-1">
                    목표 {goal} kcal · 점선 기준
                  </p>
                )}
              </div>
            );
          })()
        )}
      </section>

      {/* 선택한 날 상세 */}
      {selectedDate && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  const prev = new Date(y, m - 1, d - 1);
                  const key = toDateKey(prev);
                  if (prev.getMonth() !== cursor.getMonth() || prev.getFullYear() !== cursor.getFullYear()) {
                    setCursor(new Date(prev.getFullYear(), prev.getMonth(), 1));
                  }
                  if (calendarView === "week") setWeekStart(weekStartOf(key));
                  setSelectedDate(key);
                }}
                className="p-1 rounded-full text-ink-500 hover:bg-brand-50 hover:text-brand-600"
                aria-label="이전 날"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base font-semibold">{formatDayLabel(selectedDate)}</h2>
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  const next = new Date(y, m - 1, d + 1);
                  const key = toDateKey(next);
                  if (key > todayKey) return;
                  if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) {
                    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
                  }
                  if (calendarView === "week") setWeekStart(weekStartOf(key));
                  setSelectedDate(key);
                }}
                disabled={selectedDate >= todayKey}
                className="p-1 rounded-full text-ink-500 hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="다음 날"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-brand-600 font-bold tabular-nums flex items-center gap-1 bg-brand-50 px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5" />
              {dayDetail?.total_kcal ?? 0} kcal
            </span>
          </div>

          {/* 체중 로깅 */}
          <div className="rounded-2xl bg-white ring-1 ring-brand-100/50 shadow-[0_4px_16px_-8px_rgba(255,138,149,0.2)] px-4 py-3 flex items-center gap-3">
            <Scale className="w-4 h-4 text-brand-500 shrink-0" />
            {weightEditing ? (
              <>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={selectedWeight ? String(selectedWeight) : "예: 65.5"}
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
                />
                <span className="text-xs text-ink-500">kg</span>
                <button
                  type="button"
                  onClick={() => {
                    setWeightEditing(false);
                    setWeightInput("");
                  }}
                  className="px-3 py-1.5 text-xs rounded-xl bg-cream-100 text-ink-500"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveWeight}
                  disabled={weightSaving || !weightInput}
                  className="px-3 py-1.5 text-xs rounded-xl bg-brand-500 text-white font-bold disabled:opacity-50"
                >
                  {weightSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setWeightInput(selectedWeight ? String(selectedWeight) : "");
                  setWeightEditing(true);
                }}
                className="flex-1 flex items-center justify-between text-left active:scale-[0.98] transition"
              >
                <span className="text-xs font-semibold text-ink-500">체중</span>
                {selectedWeight != null ? (
                  <span className="flex items-baseline gap-1">
                    <span className="text-lg font-black italic tabular-nums text-ink-900 leading-none">
                      {selectedWeight}
                    </span>
                    <span className="text-xs text-ink-500">kg</span>
                    <Pencil className="w-3 h-3 text-ink-500 ml-1.5" />
                  </span>
                ) : (
                  <span className="text-[11px] text-brand-600 font-medium">기록하기 →</span>
                )}
              </button>
            )}
          </div>

          {loadingDay ? (
            <p className="text-xs text-neutral-400 text-center py-6">불러오는 중…</p>
          ) : !dayDetail || dayDetail.meals.length === 0 ? (
            <div className="rounded-xl bg-neutral-50 py-8 flex flex-col items-center gap-2 text-neutral-400">
              <Utensils className="w-6 h-6" />
              <span className="text-sm">기록된 식사가 없어요</span>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {(() => {
                const groups = new Map<MealType, DayMeal[]>();
                for (const m of dayDetail.meals) {
                  const k = m.meal_type ?? "snack";
                  const arr = groups.get(k) ?? [];
                  arr.push(m);
                  groups.set(k, arr);
                }
                for (const arr of groups.values()) {
                  arr.sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
                }
                return MEAL_ORDER.filter((k) => groups.has(k)).map((k) => {
                  const meals = groups.get(k)!;
                  const sectionKcal = meals.reduce((s, x) => s + x.total_kcal, 0);
                  return (
                    <div key={k} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{MEAL_EMOJI[k]}</span>
                          <span className="text-sm font-bold text-ink-900">
                            {MEAL_LABELS[k]}
                          </span>
                          <span className="text-[10px] text-ink-500">· {meals.length}건</span>
                        </div>
                        <span className="text-xs font-bold tabular-nums text-brand-600">
                          {sectionKcal} kcal
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {meals.map((m) => {
                          const d = new Date(m.eaten_at);
                          const time = `${String(d.getHours()).padStart(2, "0")}:${String(
                            d.getMinutes(),
                          ).padStart(2, "0")}`;
                          const mealLabel = m.meal_type ? MEAL_LABELS[m.meal_type] : "식사";
                          const mealColor = m.meal_type
                            ? MEAL_COLORS[m.meal_type]
                            : "bg-neutral-100 text-neutral-600";
                          return (
                  <div key={m.id} className="relative">
                    <div className="rounded-2xl bg-white ring-1 ring-brand-100/50 shadow-[0_4px_16px_-8px_rgba(255,138,149,0.25)] p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${mealColor}`}>
                            {mealLabel}
                          </span>
                          <span className="text-xs text-neutral-500 tabular-nums">{time}</span>
                          {m.share_count > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">
                              {m.share_count}인 공유
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-brand-600 tabular-nums shrink-0">
                          {m.total_kcal} kcal
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {m.items.map((it) => {
                          const detailKey = it.id;
                          const isOpen = !!openDetail[detailKey];
                          const hasMacro =
                            it.carb_g != null || it.protein_g != null || it.fat_g != null;
                          return (
                            <li key={it.id} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-sm text-neutral-600 gap-2">
                                <span className="truncate flex items-center gap-1.5 min-w-0">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-cream-100 text-sm shrink-0 rotate-[-4deg] shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
                                    {it.emoji ?? foodEmoji(it.name)}
                                  </span>
                                  <span className="truncate">
                                    {displayFoodName(it.name)}{" "}
                                    <span className="text-neutral-400 text-xs tabular-nums">
                                      {it.grams}g
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenDetail((prev) => ({
                                        ...prev,
                                        [detailKey]: !prev[detailKey],
                                      }))
                                    }
                                    className={`shrink-0 p-0.5 rounded hover:bg-brand-50 ${
                                      isOpen ? "text-brand-600" : "text-ink-500"
                                    }`}
                                    aria-label="상세정보"
                                    title="상세정보"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                                <span className="text-neutral-500 tabular-nums shrink-0">
                                  {it.kcal} kcal
                                </span>
                              </div>
                              {isOpen && (
                                <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 flex flex-col gap-1">
                                  <div className="flex justify-between">
                                    <span className="text-neutral-400">출처</span>
                                    <span className="tabular-nums">
                                      {it.source === "db"
                                        ? `공식 DB${it.food_source ? ` · ${it.food_source.toUpperCase()}` : ""}`
                                        : "AI 추정"}
                                    </span>
                                  </div>
                                  {it.kcal_per_100g != null && (
                                    <div className="flex justify-between">
                                      <span className="text-neutral-400">100g당</span>
                                      <span className="tabular-nums">
                                        {Math.round(it.kcal_per_100g)} kcal
                                      </span>
                                    </div>
                                  )}
                                  {hasMacro ? (
                                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                      <div>
                                        <div className="text-[10px] text-neutral-400">탄수</div>
                                        <div className="tabular-nums">
                                          {it.carb_g != null
                                            ? `${Math.round(((it.carb_g ?? 0) * it.grams) / 100)}g`
                                            : "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-neutral-400">단백</div>
                                        <div className="tabular-nums">
                                          {it.protein_g != null
                                            ? `${Math.round(((it.protein_g ?? 0) * it.grams) / 100)}g`
                                            : "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-neutral-400">지방</div>
                                        <div className="tabular-nums">
                                          {it.fat_g != null
                                            ? `${Math.round(((it.fat_g ?? 0) * it.grams) / 100)}g`
                                            : "—"}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-neutral-400 text-center pt-1">
                                      상세 영양정보 없음
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      {m.has_photo && (
                        <div className="pt-1">
                          {photoUrls[m.id] ? (
                            <button
                              type="button"
                              onClick={() => setModalUrl(photoUrls[m.id])}
                              className="w-full aspect-video rounded-xl overflow-hidden ring-1 ring-brand-100 active:scale-[0.98] transition"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrls[m.id]}
                                alt="식사 사진"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-full aspect-video rounded-xl bg-cream-100 flex items-center justify-center gap-1.5 text-xs text-ink-500 animate-pulse">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              사진 불러오는 중…
                            </div>
                          )}
                        </div>
                      )}
                      {noteEditing === m.id ? (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="이 식사에 대한 한줄 메모…"
                            rows={2}
                            maxLength={500}
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl bg-cream-50 ring-1 ring-brand-200 focus:ring-brand-400 focus:outline-none text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const original = m.note ?? "";
                                if (noteDraft.trim() !== original.trim()) {
                                  if (!window.confirm("작성 중인 메모를 버릴까요?")) return;
                                }
                                setNoteEditing(null);
                                setNoteDraft("");
                              }}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-cream-100 text-ink-500"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => saveNote(m.id)}
                              disabled={noteSaving}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-brand-500 text-white font-medium disabled:opacity-50"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : m.note ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteEditing(m.id);
                            setNoteDraft(m.note ?? "");
                          }}
                          className="text-left text-xs text-ink-700 bg-cream-50 rounded-xl px-3 py-2 ring-1 ring-brand-100 hover:ring-brand-200 transition flex items-start gap-1.5"
                        >
                          <span className="text-sm shrink-0">✏️</span>
                          <span className="whitespace-pre-wrap">{m.note}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteEditing(m.id);
                            setNoteDraft("");
                          }}
                          className="self-start text-[11px] text-ink-500 hover:text-brand-600 flex items-center gap-1 pt-0.5"
                        >
                          <Pencil className="w-3 h-3" />
                          메모 추가
                        </button>
                      )}
                    </div>
                  </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>
      )}

      {modalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setModalUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={modalUrl}
            alt="식사 사진"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </main>
  );
}
