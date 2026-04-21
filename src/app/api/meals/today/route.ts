import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meals")
    .select("id, eaten_at, meal_type, total_kcal, share_count, meal_items(grams, kcal, foods(official_name))")
    .gte("eaten_at", from)
    .lt("eaten_at", to)
    .order("eaten_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + (r.total_kcal ?? 0), 0);
  const meals = rows.map((r) => ({
    id: r.id,
    eaten_at: r.eaten_at,
    meal_type: r.meal_type,
    total_kcal: r.total_kcal,
    share_count: r.share_count,
    items: (r.meal_items ?? []).map((it) => {
      const f = it.foods as unknown as { official_name: string } | { official_name: string }[] | null;
      const name = Array.isArray(f) ? f[0]?.official_name : f?.official_name;
      return {
        name: name ?? "(이름없음)",
        grams: it.grams,
        kcal: it.kcal,
      };
    }),
  }));
  return NextResponse.json({ total_kcal: total, meals });
}
