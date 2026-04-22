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
  Share2,
  Pencil,
  LayoutGrid,
  Image as ImageIcon,
  Scale,
} from "lucide-react";
import { foodEmoji, displayFoodName } from "@/lib/food-emoji";

type Day = { date: string; total_kcal: number };
type Weekly = {
  days: Day[];
  prev_days: Day[];
  current_avg: number;
  prev_avg: number;
};
type Monthly = {
  months: { month: string; avg_kcal: number; active_days: number }[];
};
type Profile = {
  goal_kcal: number | null;
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

export default function MePage() {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [stats, setStats] = useState<Stats | null>(null);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
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
  const [view, setView] = useState<"calendar" | "gallery">("calendar");
  const [photos, setPhotos] = useState<
    { meal_id: string; eaten_at: string; total_kcal: number; url: string }[]
  >([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [photosFetchedAt, setPhotosFetchedAt] = useState(0);
  const [photosRefreshKey, setPhotosRefreshKey] = useState(0);
  const [weightLogs, setWeightLogs] = useState<
    { logged_on: string; weight_kg: number }[]
  >([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightEditing, setWeightEditing] = useState(false);
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/stats/weekly`);
      if (!res.ok) return;
      setWeekly(await res.json());
    })();
  }, []);

  const loadWeights = useCallback(async () => {
    const res = await fetch("/api/weight?days=90");
    if (!res.ok) return;
    const data = (await res.json()) as {
      logs: { logged_on: string; weight_kg: number }[];
    };
    setWeightLogs(data.logs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/weight?days=90");
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

  const todayWeight = weightLogs.find((l) => l.logged_on === todayKey)?.weight_kg ?? null;
  const lastWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null;
  const weightDelta =
    weightLogs.length >= 2
      ? Number((weightLogs[weightLogs.length - 1].weight_kg - weightLogs[0].weight_kg).toFixed(1))
      : null;

  const saveWeight = async () => {
    const n = Number(weightInput);
    if (!Number.isFinite(n) || n < 20 || n > 400) return;
    setWeightSaving(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_kg: n }),
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
    if (view !== "gallery") return;
    let cancelled = false;
    void (async () => {
      setLoadingPhotos(true);
      try {
        const res = await fetch(`/api/stats/photos?month=${formatMonthKey(cursor)}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          photos: { meal_id: string; eaten_at: string; total_kcal: number; url: string }[];
        };
        if (!cancelled) {
          setPhotos(data.photos);
          setPhotosFetchedAt(Date.now());
        }
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, cursor, photosRefreshKey]);

  useEffect(() => {
    if (view !== "gallery") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - photosFetchedAt < 8 * 60 * 1000) return;
      setPhotosRefreshKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [view, photosFetchedAt]);

  useEffect(() => {
    if (!selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDayDetail(null);
      return;
    }
    void loadDay(selectedDate);
  }, [selectedDate, loadDay]);

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

  const handleShare = useCallback(async () => {
    if (!weekly) return;
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#FF8A95");
    grad.addColorStop(1, "#EE5363");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(size - 120, 100, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(80, size - 80, 160, 0, Math.PI * 2);
    ctx.fill();

    const font = `"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `600 36px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText("CalClick · 이번 주 식단", 80, 140);

    ctx.fillStyle = "#fff";
    ctx.font = `800 64px ${font}`;
    const startDate = weekly.days[0]?.date ?? "";
    const endDate = weekly.days[weekly.days.length - 1]?.date ?? "";
    const fmt = (d: string) => {
      const [, m, day] = d.split("-");
      return `${Number(m)}.${Number(day)}`;
    };
    if (startDate && endDate) {
      ctx.fillText(`${fmt(startDate)} - ${fmt(endDate)}`, 80, 220);
    }

    ctx.font = `500 32px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("일 평균", 80, 320);
    ctx.fillStyle = "#fff";
    ctx.font = `900 160px ${font}`;
    ctx.fillText(`${weekly.current_avg}`, 80, 470);
    ctx.font = `500 40px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("kcal", 80 + ctx.measureText(`${weekly.current_avg}`).width + 16, 470);

    if (weekly.prev_avg > 0) {
      const delta = weekly.current_avg - weekly.prev_avg;
      const sign = delta >= 0 ? "+" : "";
      ctx.font = `600 28px ${font}`;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(`지난주 대비 ${sign}${delta} kcal`, 80, 520);
    }

    const chartTop = 600;
    const chartH = 280;
    const chartW = size - 160;
    const barGap = 16;
    const barW = (chartW - barGap * 6) / 7;
    const maxVal = Math.max(1, ...weekly.days.map((d) => d.total_kcal));
    weekly.days.forEach((d, i) => {
      const x = 80 + i * (barW + barGap);
      const h = d.total_kcal === 0 ? 12 : (d.total_kcal / maxVal) * chartH;
      const y = chartTop + chartH - h;
      ctx.fillStyle = d.date === todayKey ? "#fff" : "rgba(255,255,255,0.55)";
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, chartTop + chartH);
      ctx.lineTo(x, chartTop + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      const dow = ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek(d.date)];
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `600 24px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(dow, x + barW / 2, chartTop + chartH + 42);
      ctx.textAlign = "left";
    });

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `500 28px ${font}`;
    ctx.fillText("calclick.app", size - 80, size - 60);
    ctx.textAlign = "left";

    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], "calclick-week.png", { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
      share?: (d: ShareData) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: "CalClick 이번 주" });
        return;
      } catch {
        // fallthrough to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calclick-week.png";
    a.click();
    URL.revokeObjectURL(url);
  }, [weekly, todayKey]);

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

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="CalClick" className="w-8 h-8 rounded-xl shadow-[0_4px_12px_rgba(255,138,149,0.3)]" />
          <h1 className="text-xl font-black italic tracking-[-0.04em]">마이</h1>
        </div>
        {streak > 0 && (
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full flex items-center gap-1 ring-1 ring-brand-100">
            🔥 {streak}일째
          </span>
        )}
      </header>

      {/* 월 요약 카드 */}
      <section className="relative rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white p-5 shadow-[0_12px_32px_-8px_rgba(255,138,149,0.45)] overflow-hidden">
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
            <div className="text-xl font-semibold tabular-nums">{stats?.total_kcal ?? 0}</div>
            <div className="text-[9px] text-white/60">kcal</div>
          </div>
          <div className="border-x border-white/20">
            <div className="text-[10px] text-white/70">일 평균</div>
            <div className="text-xl font-semibold tabular-nums">{stats?.avg_kcal ?? 0}</div>
            <div className="text-[9px] text-white/60">kcal</div>
          </div>
          <div>
            <div className="text-[10px] text-white/70">기록 일수</div>
            <div className="text-xl font-semibold tabular-nums">{stats?.active_days ?? 0}</div>
            <div className="text-[9px] text-white/60">일</div>
          </div>
        </div>
      </section>

      {/* 주간 차트 */}
      {weekly && (
        <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold">이번 주</h2>
              {weekly.prev_avg > 0 && weekly.current_avg > 0 && (
                <span className="text-[11px] text-ink-500">
                  지난주 대비{" "}
                  <span
                    className={
                      weekly.current_avg >= weekly.prev_avg
                        ? "text-brand-600 font-bold"
                        : "text-mint-600 font-bold"
                    }
                  >
                    {weekly.current_avg >= weekly.prev_avg ? "+" : ""}
                    {weekly.current_avg - weekly.prev_avg} kcal
                  </span>
                </span>
              )}
            </div>
            {weekly.current_avg > 0 && (
              <button
                type="button"
                onClick={handleShare}
                className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2 py-1 rounded-full bg-brand-50 ring-1 ring-brand-100"
              >
                <Share2 className="w-3 h-3" />
                공유
              </button>
            )}
          </div>
          <div className="flex items-end justify-between gap-1.5 h-28">
            {weekly.days.map((d, i) => {
              const max = Math.max(1, ...weekly.days.map((x) => x.total_kcal));
              const pct = (d.total_kcal / max) * 100;
              const isToday = d.date === todayKey;
              const dow = ["일", "월", "화", "수", "목", "금", "토"][dayOfWeek(d.date)];
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    const [y, m] = d.date.split("-").map(Number);
                    setCursor(new Date(y, m - 1, 1));
                    setSelectedDate(d.date);
                  }}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-[9px] tabular-nums text-ink-500 h-3">
                    {d.total_kcal > 0 ? d.total_kcal : ""}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition group-hover:opacity-80 ${
                        d.total_kcal === 0
                          ? "bg-cream-100"
                          : isToday
                            ? "bg-gradient-to-t from-brand-600 to-brand-400"
                            : "bg-brand-200"
                      }`}
                      style={{ height: `${Math.max(d.total_kcal === 0 ? 6 : 12, pct)}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isToday
                        ? "text-brand-600"
                        : i === 0 || dow === "일"
                          ? "text-brand-400"
                          : dow === "토"
                            ? "text-mint-600"
                            : "text-ink-500"
                    }`}
                  >
                    {dow}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 체중 카드 */}
      <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-brand-500" />
            체중
          </h2>
          {weightDelta != null && weightLogs.length >= 2 && (
            <span
              className={`text-[11px] font-bold ${
                weightDelta > 0
                  ? "text-brand-600"
                  : weightDelta < 0
                    ? "text-mint-600"
                    : "text-ink-500"
              }`}
            >
              {weightDelta > 0 ? "+" : ""}
              {weightDelta} kg · 90일
            </span>
          )}
        </div>
        {weightEditing ? (
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={lastWeight ? String(lastWeight) : "예: 65.5"}
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => {
                setWeightEditing(false);
                setWeightInput("");
              }}
              className="px-3 py-2 text-xs rounded-xl bg-cream-100 text-ink-500"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveWeight}
              disabled={weightSaving || !weightInput}
              className="px-4 py-2 text-xs rounded-xl bg-brand-500 text-white font-bold disabled:opacity-50"
            >
              {weightSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWeightInput(todayWeight ? String(todayWeight) : lastWeight ? String(lastWeight) : "");
              setWeightEditing(true);
            }}
            className="text-left flex items-baseline gap-2 active:scale-[0.98] transition"
          >
            <span className="text-3xl font-black italic tabular-nums text-ink-900">
              {todayWeight ?? lastWeight ?? "—"}
            </span>
            <span className="text-sm text-ink-500">kg</span>
            {todayWeight == null && (
              <span className="text-[11px] text-brand-600 font-medium ml-auto">
                오늘 기록하기 →
              </span>
            )}
          </button>
        )}
        {weightLogs.length >= 2 &&
          (() => {
            const w = 280;
            const h = 48;
            const vals = weightLogs.map((l) => l.weight_kg);
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            const range = Math.max(0.5, max - min);
            const pts = weightLogs
              .map((l, i) => {
                const x = (i / Math.max(1, weightLogs.length - 1)) * w;
                const y = h - ((l.weight_kg - min) / range) * h;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#FF8A95"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            );
          })()}
      </section>

      {/* 월간 추세 */}
      {monthly && monthly.months.some((m) => m.avg_kcal > 0) && (
        <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">월별 일 평균</h2>
            {profile?.goal_kcal && (
              <span className="text-[10px] text-ink-500">
                목표 {profile.goal_kcal} kcal
              </span>
            )}
          </div>
          {(() => {
            const goal = profile?.goal_kcal ?? 0;
            const maxVal = Math.max(goal, ...monthly.months.map((m) => m.avg_kcal), 1);
            return (
              <div className="flex items-end justify-between gap-2 h-28 relative">
                {goal > 0 && (
                  <span
                    className="absolute left-0 right-0 border-t border-dashed border-brand-300/70"
                    style={{ bottom: `${(goal / maxVal) * 100}%` }}
                    aria-hidden
                  />
                )}
                {monthly.months.map((m) => {
                  const pct = m.avg_kcal === 0 ? 0 : (m.avg_kcal / maxVal) * 100;
                  const over = goal > 0 && m.avg_kcal > goal;
                  const [, mm] = m.month.split("-");
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] tabular-nums text-ink-500 h-3">
                        {m.avg_kcal > 0 ? m.avg_kcal : ""}
                      </span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition ${
                            m.avg_kcal === 0
                              ? "bg-cream-100"
                              : over
                                ? "bg-gradient-to-t from-brand-600 to-brand-400"
                                : "bg-mint-300"
                          }`}
                          style={{ height: `${Math.max(m.avg_kcal === 0 ? 6 : 12, pct)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-ink-500 tabular-nums">
                        {Number(mm)}월
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      {/* 뷰 토글 */}
      <div className="flex bg-white rounded-full p-1 ring-1 ring-brand-100/50 shadow-sm text-xs">
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full transition ${
            view === "calendar"
              ? "bg-brand-500 text-white font-bold shadow-sm"
              : "text-ink-500"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          달력
        </button>
        <button
          type="button"
          onClick={() => setView("gallery")}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-full transition ${
            view === "gallery"
              ? "bg-brand-500 text-white font-bold shadow-sm"
              : "text-ink-500"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          사진
        </button>
      </div>

      {view === "gallery" && (
        <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-3 flex flex-col gap-2">
          {loadingPhotos ? (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="aspect-square rounded-xl bg-cream-100 animate-pulse" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <p className="text-center text-xs text-ink-500 py-10">
              이번 달엔 사진 기록이 없어요 📷
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((p) => {
                const d = new Date(p.eaten_at);
                return (
                  <button
                    key={p.meal_id}
                    type="button"
                    onClick={() => setModalUrl(p.url)}
                    className="relative aspect-square rounded-xl overflow-hidden ring-1 ring-brand-100/60 active:scale-[0.97] transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="식사" className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/50 rounded-md px-1.5 py-0.5 tabular-nums">
                      {p.total_kcal}
                    </span>
                    <span className="absolute top-1 left-1 text-[9px] text-white bg-black/40 rounded-md px-1.5 py-0.5 tabular-nums">
                      {d.getMonth() + 1}.{d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 달력 */}
      {view === "calendar" && (
      <section className="rounded-3xl bg-white shadow-[0_8px_24px_-12px_rgba(255,138,149,0.2)] ring-1 ring-brand-100/50 p-4 flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-neutral-400 text-center pb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <span key={d} className={i === 0 ? "text-brand-400" : i === 6 ? "text-mint-600" : ""}>
              {d}
            </span>
          ))}
        </div>
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
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => handleSelect(d.date)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition ${bg} ${
                  isSelected
                    ? "ring-2 ring-brand-600 scale-105 shadow-md"
                    : isToday
                      ? "ring-1 ring-brand-500"
                      : "hover:ring-1 hover:ring-brand-200"
                }`}
              >
                <span className="text-[11px] font-medium tabular-nums leading-none">{day}</span>
                {has && (
                  <span className="text-[9px] tabular-nums leading-none mt-0.5 opacity-90">
                    {d.total_kcal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      )}

      {/* 선택한 날 상세 */}
      {view === "calendar" && selectedDate && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  const prev = new Date(y, m - 1, d - 1);
                  const key = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
                  if (prev.getMonth() !== cursor.getMonth() || prev.getFullYear() !== cursor.getFullYear()) {
                    setCursor(new Date(prev.getFullYear(), prev.getMonth(), 1));
                  }
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
                  const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
                  if (key > todayKey) return;
                  if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) {
                    setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
                  }
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
