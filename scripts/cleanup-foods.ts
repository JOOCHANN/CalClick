import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase env missing");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: legacy, error: e1 } = await supabase
    .from("foods")
    .select("food_id, official_name")
    .not("food_id", "like", "mfds_%");
  if (e1) throw e1;
  console.log(`legacy(non-mfds): ${legacy?.length ?? 0}`);

  if (!legacy || legacy.length === 0) return;

  const ids = legacy.map((r) => r.food_id);
  const { data: refs, error: e2 } = await supabase
    .from("meal_items")
    .select("food_id")
    .in("food_id", ids);
  if (e2) throw e2;
  const referenced = new Set((refs ?? []).map((r) => r.food_id));
  const orphans = legacy.filter((r) => !referenced.has(r.food_id));
  console.log(`참조 있음: ${referenced.size}, 삭제 대상(고아): ${orphans.length}`);

  for (const o of orphans) {
    console.log(`  - ${o.food_id} (${o.official_name})`);
  }

  if (orphans.length === 0) return;

  const orphanIds = orphans.map((o) => o.food_id);
  const { error: e3 } = await supabase.from("food_aliases").delete().in("food_id", orphanIds);
  if (e3) throw e3;
  const { error: e4 } = await supabase.from("foods").delete().in("food_id", orphanIds);
  if (e4) throw e4;

  console.log(`✅ 삭제 완료: ${orphans.length}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
