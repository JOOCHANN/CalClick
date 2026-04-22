import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const n = Math.min(24, Math.max(1, Number(url.searchParams.get("n") ?? 6)));

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);

  const { data, error } = await supabase
    .from("meals")
    .select("eaten_at, total_kcal")
    .gte("eaten_at", from.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const buckets = new Map<string, { total: number; days: Set<string> }>();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { total: 0, days: new Set() });
  }
  for (const r of data ?? []) {
    const dt = new Date(r.eaten_at);
    const mKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const dKey = `${mKey}-${String(dt.getDate()).padStart(2, "0")}`;
    const b = buckets.get(mKey);
    if (!b) continue;
    b.total += r.total_kcal ?? 0;
    b.days.add(dKey);
  }

  const months = Array.from(buckets.entries()).map(([month, b]) => ({
    month,
    total_kcal: b.total,
    active_days: b.days.size,
    avg_kcal: b.days.size > 0 ? Math.round(b.total / b.days.size) : 0,
  }));

  return NextResponse.json({ months });
}
