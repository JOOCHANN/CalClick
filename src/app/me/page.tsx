"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

type Day = { date: string; total_kcal: number };
type Stats = {
  month: string;
  days: Day[];
  total_kcal: number;
  avg_kcal: number;
  active_days: number;
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

export default function MePage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/daily?month=${formatMonthKey(cursor)}`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const monthLabel = formatMonthLabel(cursor);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const maxKcal = Math.max(1, ...(stats?.days.map((d) => d.total_kcal) ?? [1]));

  const firstDow = stats?.days[0] ? dayOfWeek(stats.days[0].date) : 0;

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">마이페이지</h1>
        <Link href="/" className="text-xs text-neutral-500 underline">홈</Link>
      </header>

      <section className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-2 rounded hover:bg-neutral-100"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-lg font-medium tabular-nums">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-2 rounded hover:bg-neutral-100"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Card className="py-3 px-3 flex flex-col items-center">
          <span className="text-xs text-neutral-500">합계</span>
          <span className="text-lg font-semibold text-green-600 tabular-nums">
            {stats?.total_kcal ?? 0}
          </span>
          <span className="text-[10px] text-neutral-400">kcal</span>
        </Card>
        <Card className="py-3 px-3 flex flex-col items-center">
          <span className="text-xs text-neutral-500">일 평균</span>
          <span className="text-lg font-semibold text-green-600 tabular-nums">
            {stats?.avg_kcal ?? 0}
          </span>
          <span className="text-[10px] text-neutral-400">kcal</span>
        </Card>
        <Card className="py-3 px-3 flex flex-col items-center">
          <span className="text-xs text-neutral-500">기록 일수</span>
          <span className="text-lg font-semibold text-green-600 tabular-nums">
            {stats?.active_days ?? 0}
          </span>
          <span className="text-[10px] text-neutral-400">일</span>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-[10px] text-neutral-400 text-center">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => (
            <span key={`pad-${i}`} />
          ))}
          {stats?.days.map((d) => {
            const intensity = d.total_kcal / maxKcal;
            const bg =
              d.total_kcal === 0
                ? "bg-neutral-100"
                : intensity < 0.33
                  ? "bg-green-100"
                  : intensity < 0.66
                    ? "bg-green-300"
                    : "bg-green-500";
            const isToday = d.date === todayKey;
            const day = Number(d.date.slice(-2));
            return (
              <div
                key={d.date}
                className={`aspect-square rounded flex flex-col items-center justify-center ${bg} ${
                  isToday ? "ring-2 ring-green-700" : ""
                }`}
                title={`${d.date} · ${d.total_kcal} kcal`}
              >
                <span className="text-[10px] text-neutral-700 tabular-nums">{day}</span>
                {d.total_kcal > 0 && (
                  <span className="text-[9px] text-neutral-800 tabular-nums">
                    {d.total_kcal}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {loading && <p className="text-xs text-neutral-400 text-center">불러오는 중…</p>}
    </main>
  );
}
