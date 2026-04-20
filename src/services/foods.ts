import "server-only";
import { supabaseServer } from "./supabase-server";

export type FoodLookup = {
  food_id: string;
  official_name: string;
  kcal_per_100g: number;
};

export async function findFoodByAlias(name: string): Promise<FoodLookup | null> {
  const alias = name.trim();
  if (!alias) return null;
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("food_aliases")
    .select("food_id, foods!inner(food_id, official_name, kcal_per_100g)")
    .eq("alias", alias)
    .maybeSingle();
  if (error || !data) return null;
  const f = (data as unknown as { foods: FoodLookup }).foods;
  return {
    food_id: f.food_id,
    official_name: f.official_name,
    kcal_per_100g: f.kcal_per_100g,
  };
}

export function computeKcal(kcalPer100g: number, grams: number): number {
  return Math.round((kcalPer100g * grams) / 100);
}
