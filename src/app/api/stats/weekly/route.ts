import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 13);
  const end = new Date(today);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("meals")
    .select("eaten_at, total_kcal")
    .gte("eaten_at", start.toISOString())
    .lt("eaten_at", end.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byDate = new Map<string, number>();
  for (const r of data ?? []) {
    const d = new Date(r.eaten_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDate.set(key, (byDate.get(key) ?? 0) + (r.total_kcal ?? 0));
  }

  const days: { date: string; total_kcal: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ date: key, total_kcal: byDate.get(key) ?? 0 });
  }

  const prev = days.slice(0, 7);
  const curr = days.slice(7);
  const avg = (arr: { total_kcal: number }[]) => {
    const active = arr.filter((x) => x.total_kcal > 0);
    return active.length > 0 ? Math.round(active.reduce((s, x) => s + x.total_kcal, 0) / active.length) : 0;
  };

  return NextResponse.json({
    days: curr,
    prev_days: prev,
    current_avg: avg(curr),
    prev_avg: avg(prev),
  });
}
