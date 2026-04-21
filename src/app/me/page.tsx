"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Flame,
  Calendar as CalendarIcon,
  ImageIcon,
  Info,
  Loader2,
} from "lucide-react";

type Day = { date: string; total_kcal: number };
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
  items: DayItem[];
};
type DayDetail = { total_kcal: number; meals: DayMeal[] };

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch: "bg-emerald-100 text-emerald-700",
  dinner: "bg-indigo-100 text-indigo-700",
  snack: "bg-pink-100 text-pink-700",
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
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loadingPhoto, setLoadingPhoto] = useState<Record<string, boolean>>({});
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});

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
    if (!selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDayDetail(null);
      return;
    }
    void loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  const monthLabel = formatMonthLabel(cursor);
  const maxKcal = Math.max(1, ...(stats?.days.map((d) => d.total_kcal) ?? [1]));
  const firstDow = stats?.days[0] ? dayOfWeek(stats.days[0].date) : 0;

  const handleSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">마이페이지</h1>
        <Link href="/" className="text-xs text-neutral-500 underline">
          홈
        </Link>
      </header>

      {/* 월 요약 카드 */}
      <section className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white p-5 shadow-sm">
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

      {/* 달력 */}
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-neutral-100 p-3 flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-medium text-neutral-400 text-center pb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
            <span key={d} className={i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : ""}>
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {stats?.days.map((d) => {
            const intensity = d.total_kcal / maxKcal;
            const has = d.total_kcal > 0;
            const bg = !has
              ? "bg-neutral-50 text-neutral-400"
              : intensity < 0.33
                ? "bg-green-100 text-green-900"
                : intensity < 0.66
                  ? "bg-green-300 text-green-950"
                  : "bg-green-600 text-white";
            const isToday = d.date === todayKey;
            const isSelected = d.date === selectedDate;
            const day = Number(d.date.slice(-2));
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => handleSelect(d.date)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center transition ${bg} ${
                  isSelected
                    ? "ring-2 ring-green-700 scale-105 shadow"
                    : isToday
                      ? "ring-1 ring-green-700"
                      : "hover:ring-1 hover:ring-green-400"
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

      {/* 선택한 날 상세 */}
      {selectedDate && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">{formatDayLabel(selectedDate)}</h2>
            <span className="text-sm text-green-600 font-semibold tabular-nums flex items-center gap-1">
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
            <div className="relative flex flex-col gap-3 pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-neutral-200" aria-hidden />
              {dayDetail.meals.map((m) => {
                const d = new Date(m.eaten_at);
                const time = `${String(d.getHours()).padStart(2, "0")}:${String(
                  d.getMinutes(),
                ).padStart(2, "0")}`;
                const mealLabel = m.meal_type ? MEAL_LABELS[m.meal_type] : "식사";
                const mealColor = m.meal_type ? MEAL_COLORS[m.meal_type] : "bg-neutral-100 text-neutral-600";
                return (
                  <div key={m.id} className="relative">
                    <span className="absolute -left-[18px] top-2 w-3 h-3 rounded-full bg-green-500 ring-4 ring-white" />
                    <div className="rounded-xl bg-white ring-1 ring-neutral-100 shadow-sm p-3 flex flex-col gap-2">
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
                        <span className="text-sm font-semibold text-green-600 tabular-nums shrink-0">
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
                                  <span className="truncate">
                                    {it.name}{" "}
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
                                    className={`shrink-0 p-0.5 rounded hover:bg-neutral-100 ${
                                      isOpen ? "text-green-600" : "text-neutral-400"
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
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoUrls[m.id]}
                              alt="식사 사진"
                              className="w-full rounded-lg object-cover max-h-60"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => loadPhoto(m.id)}
                              disabled={loadingPhoto[m.id]}
                              className="w-full flex items-center justify-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 hover:bg-neutral-100 rounded-lg py-2 disabled:opacity-60"
                            >
                              {loadingPhoto[m.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ImageIcon className="w-3.5 h-3.5" />
                              )}
                              {loadingPhoto[m.id] ? "불러오는 중…" : "사진 보기"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
