import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const {
  MFDS_API_ENDPOINT,
  MFDS_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!MFDS_API_ENDPOINT || !MFDS_API_KEY) throw new Error("MFDS_API_* missing");
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase env missing");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Item = {
  foodCd: string;
  foodNm: string;
  enerc: string;
  nutConSrtrQua?: string;
};

async function fetchPage(pageNo: number, numOfRows: number) {
  const url = `${process.env.MFDS_API_ENDPOINT}?serviceKey=${process.env.MFDS_API_KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}&type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    response: {
      header: { resultCode: string; resultMsg: string };
      body?: { items: Item[]; totalCount: string };
    };
  };
  if (json.response.header.resultCode !== "00") {
    throw new Error(`API ${json.response.header.resultCode}: ${json.response.header.resultMsg}`);
  }
  return json.response.body!;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const perPage = 1000;
  const first = await fetchPage(1, perPage);
  const total = Number(first.totalCount);
  const pages = Math.ceil(total / perPage);
  console.log(`총 ${total}건, ${pages} pages`);

  const all: Item[] = [...first.items];
  for (let p = 2; p <= pages; p++) {
    await new Promise((r) => setTimeout(r, 300));
    let body;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        body = await fetchPage(p, perPage);
        break;
      } catch (e) {
        if (attempt === 3) throw e;
        console.log(`  page ${p} attempt ${attempt}실패, 재시도...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    all.push(...body!.items);
    console.log(`  page ${p}/${pages} (+${body!.items.length})`);
  }
  console.log(`수집 완료: ${all.length}`);

  const byName = new Map<string, Item>();
  for (const it of all) {
    const name = it.foodNm?.trim();
    const kcal = Number(it.enerc);
    if (!name || !Number.isFinite(kcal) || kcal < 0) continue;
    if (!byName.has(name)) byName.set(name, it);
  }
  console.log(`foodNm 기준 dedupe: ${byName.size}`);

  const foodsRows = [...byName.values()].map((it) => ({
    food_id: `mfds_${it.foodCd}`,
    official_name: it.foodNm.trim(),
    kcal_per_100g: Number(it.enerc),
    source: "mfds" as const,
  }));
  const aliasRows = foodsRows.map((r) => ({
    alias: r.official_name,
    food_id: r.food_id,
  }));

  let foodsDone = 0;
  for (const batch of chunk(foodsRows, 500)) {
    const { error } = await supabase.from("foods").upsert(batch, { onConflict: "food_id" });
    if (error) throw error;
    foodsDone += batch.length;
    console.log(`  foods upsert ${foodsDone}/${foodsRows.length}`);
  }

  let aliasDone = 0;
  for (const batch of chunk(aliasRows, 500)) {
    const { error } = await supabase.from("food_aliases").upsert(batch, { onConflict: "alias" });
    if (error) throw error;
    aliasDone += batch.length;
    console.log(`  food_aliases upsert ${aliasDone}/${aliasRows.length}`);
  }

  console.log("✅ 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
