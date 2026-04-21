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
    .select(
      "id, eaten_at, meal_type, total_kcal, share_count, photo_path, meal_items(id, grams, kcal, name, source, food_id, emoji, foods(official_name, kcal_per_100g, carb_g, protein_g, fat_g, source))",
    )
    .gte("eaten_at", from)
    .lt("eaten_at", to)
    .order("eaten_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  type FoodRow = {
    official_name: string;
    kcal_per_100g: number | null;
    carb_g: number | null;
    protein_g: number | null;
    fat_g: number | null;
    source: string | null;
  };
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + (r.total_kcal ?? 0), 0);
  const meals = rows.map((r) => ({
    id: r.id,
    eaten_at: r.eaten_at,
    meal_type: r.meal_type,
    total_kcal: r.total_kcal,
    share_count: r.share_count,
    has_photo: !!r.photo_path,
    items: (r.meal_items ?? []).map((it) => {
      const fRaw = it.foods as unknown as FoodRow | FoodRow[] | null;
      const f = Array.isArray(fRaw) ? fRaw[0] ?? null : fRaw;
      const raw = it as {
        id: string;
        name?: string | null;
        source?: string | null;
        food_id?: string | null;
        emoji?: string | null;
      };
      return {
        id: raw.id,
        name: f?.official_name ?? raw.name ?? "(이름없음)",
        grams: it.grams,
        kcal: it.kcal,
        emoji: raw.emoji ?? null,
        source: (raw.source ?? (f ? "db" : "llm")) as "db" | "llm",
        food_id: raw.food_id ?? null,
        kcal_per_100g: f?.kcal_per_100g ?? null,
        carb_g: f?.carb_g ?? null,
        protein_g: f?.protein_g ?? null,
        fat_g: f?.fat_g ?? null,
        food_source: f?.source ?? null,
      };
    }),
  }));
  return NextResponse.json({ total_kcal: total, meals });
}
