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
  if (!error && data) {
    for (const row of data as unknown as Array<{ alias: string; foods: FoodLookup }>) {
      result.set(row.alias, row.foods);
    }
  }

  const unresolved = trimmed.filter((n) => !result.has(n));
  if (unresolved.length > 0) {
    await Promise.all(
      unresolved.map(async (name) => {
        const { data: fuzzy } = await supabase
          .from("foods")
          .select("food_id, official_name, kcal_per_100g")
          .ilike("official_name", `%${name}%`)
          .limit(30);
        if (!fuzzy || fuzzy.length === 0) return;
        const EXCLUDE = ["(R)", "(S)", "(L)", "(F)", "(Tall)", "(Venti)", "간편조리세트"];
        const filtered = fuzzy.filter(
          (r) => !EXCLUDE.some((w) => r.official_name.includes(w)),
        );
        const pool = filtered.length > 0 ? filtered : fuzzy;
        const best = pool.sort((a, b) => a.official_name.length - b.official_name.length)[0];
        result.set(name, best as FoodLookup);
      }),
    );
  }

  return result;
}

export function computeKcal(kcalPer100g: number, grams: number): number {
  return Math.round((kcalPer100g * grams) / 100);
}

export async function findFoodCandidatesForName(
  name: string,
  limit = 3,
): Promise<FoodLookup[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const supabase = publicClient();
  const results: FoodLookup[] = [];
  const seen = new Set<string>();

  const { data: aliasHit } = await supabase
    .from("food_aliases")
    .select("foods!inner(food_id, official_name, kcal_per_100g)")
    .eq("alias", trimmed)
    .maybeSingle();
  const fromAlias = (aliasHit as unknown as { foods: FoodLookup } | null)?.foods;
  if (fromAlias) {
    results.push(fromAlias);
    seen.add(fromAlias.food_id);
  }

  const { data: fuzzy } = await supabase
    .from("foods")
    .select("food_id, official_name, kcal_per_100g")
    .ilike("official_name", `%${trimmed}%`)
    .limit(30);
  if (fuzzy) {
    const EXCLUDE = ["(R)", "(S)", "(L)", "(F)", "(Tall)", "(Venti)", "간편조리세트"];
    const sorted = fuzzy
      .filter((r) => !EXCLUDE.some((w) => r.official_name.includes(w)))
      .sort((a, b) => a.official_name.length - b.official_name.length);
    for (const r of sorted) {
      if (results.length >= limit) break;
      if (seen.has(r.food_id)) continue;
      results.push(r as FoodLookup);
      seen.add(r.food_id);
    }
  }
  return results;
}
