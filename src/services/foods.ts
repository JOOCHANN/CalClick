import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type FoodLookup = {
  food_id: string;
  official_name: string;
  kcal_per_100g: number;
};

function publicClient() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function findFoodByAlias(name: string): Promise<FoodLookup | null> {
  const map = await findFoodsByAliases([name]);
  return map.get(name.trim()) ?? null;
}

export async function findFoodsByAliases(
  names: string[],
): Promise<Map<string, FoodLookup>> {
  const trimmed = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const result = new Map<string, FoodLookup>();
  if (trimmed.length === 0) return result;

  const supabase = publicClient();
  const { data, error } = await supabase
    .from("food_aliases")
    .select("alias, foods!inner(food_id, official_name, kcal_per_100g)")
    .in("alias", trimmed);
  if (error || !data) return result;

  for (const row of data as unknown as Array<{ alias: string; foods: FoodLookup }>) {
    result.set(row.alias, row.foods);
  }
  return result;
}

export function computeKcal(kcalPer100g: number, grams: number): number {
  return Math.round((kcalPer100g * grams) / 100);
}
