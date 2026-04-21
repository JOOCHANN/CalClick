import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/services/supabase-server";
import { findFoodsByAliases, computeKcal } from "@/services/foods";
import { checkRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string().min(1),
        grams: z.number().positive().max(5000),
      }),
    )
    .min(1),
  eatenAt: z.string().datetime().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  shareCount: z.number().int().positive().default(1),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkRateLimit(`meals:${user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", detail: parsed.error.flatten() }, { status: 400 });
  }
  const { candidates, eatenAt, mealType, shareCount, note } = parsed.data;

  const foodMap = await findFoodsByAliases(candidates.map((c) => c.name));
  const unknown = candidates.filter((c) => !foodMap.get(c.name.trim())).map((c) => c.name);
  if (unknown.length > 0) {
    return NextResponse.json({ error: "unknown_foods", unknown }, { status: 400 });
  }

  const items = candidates.map((c) => {
    const f = foodMap.get(c.name.trim())!;
    const rawKcal = computeKcal(f.kcal_per_100g, c.grams);
    return {
      food_id: f.food_id,
      grams: c.grams,
      kcal: Math.round(rawKcal / shareCount),
    };
  });
  const totalKcal = items.reduce((s, it) => s + it.kcal, 0);

  const { data: meal, error: mealErr } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      eaten_at: eatenAt ?? new Date().toISOString(),
      meal_type: mealType ?? null,
      total_kcal: totalKcal,
      share_count: shareCount,
      note: note ?? null,
    })
    .select("id")
    .single();
  if (mealErr || !meal) {
    return NextResponse.json({ error: "meal_insert_failed", detail: mealErr?.message }, { status: 500 });
  }

  const { error: itemsErr } = await supabase
    .from("meal_items")
    .insert(items.map((it) => ({ ...it, meal_id: meal.id })));
  if (itemsErr) {
    await supabase.from("meals").delete().eq("id", meal.id);
    return NextResponse.json({ error: "items_insert_failed", detail: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ meal_id: meal.id, total_kcal: totalKcal }, { status: 201 });
}
