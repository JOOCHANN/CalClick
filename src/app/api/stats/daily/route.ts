import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM required" }, { status: 400 });
  }
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);

  const { data, error } = await supabase
    .from("meals")
    .select("eaten_at, total_kcal")
    .gte("eaten_at", from.toISOString())
    .lt("eaten_at", to.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byDate = new Map<string, number>();
  for (const r of data ?? []) {
    const d = new Date(r.eaten_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    byDate.set(key, (byDate.get(key) ?? 0) + (r.total_kcal ?? 0));
  }
  const days: { date: string; total_kcal: number }[] = [];
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: key, total_kcal: byDate.get(key) ?? 0 });
  }
  const total = days.reduce((s, x) => s + x.total_kcal, 0);
  const activeDays = days.filter((x) => x.total_kcal > 0).length;
  const avg = activeDays > 0 ? Math.round(total / activeDays) : 0;
  return NextResponse.json({ month, days, total_kcal: total, avg_kcal: avg, active_days: activeDays });
}
