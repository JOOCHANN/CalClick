import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase env missing");
}
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// LLM이 자주 뱉는 일반명 (MFDS official_name에는 "김치_배추김치" 같이 세분화돼 있는 경우가 많음)
const COMMON = [
  "김치", "배추김치", "깍두기", "총각김치", "열무김치", "파김치", "오이소박이",
  "쌀밥", "현미밥", "잡곡밥", "보리밥", "콩나물밥",
  "된장국", "된장찌개", "김치찌개", "미역국", "콩나물국", "북엇국", "시금치국", "계란국",
  "불고기", "제육볶음", "삼겹살", "갈비", "돼지갈비", "소갈비", "닭갈비", "닭볶음탕",
  "고등어구이", "갈치구이", "삼치구이", "꽁치구이", "조기구이",
  "고등어조림", "갈치조림", "꽁치조림",
  "계란말이", "계란프라이", "계란찜", "계란국",
  "콩나물무침", "시금치무침", "무생채", "무나물", "숙주나물", "고사리나물",
  "오이무침", "미역무침", "도라지무침",
  "김", "김자반", "멸치볶음", "어묵볶음", "감자볶음", "감자조림", "두부조림", "두부부침",
  "비빔밥", "김밥", "라면", "떡볶이", "순대", "튀김",
  "된장", "고추장", "간장",
];

async function main() {
  let added = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const name of COMMON) {
    const { data: exists } = await sb
      .from("food_aliases")
      .select("alias")
      .eq("alias", name)
      .maybeSingle();
    if (exists) {
      skipped++;
      continue;
    }

    // 1) 완전 일치 우선
    const { data: exact } = await sb
      .from("foods")
      .select("food_id, official_name")
      .eq("official_name", name)
      .limit(1);

    let best: { food_id: string; official_name: string } | undefined = exact?.[0];

    // 2) "<name>_" 또는 "<name> " 로 시작 (일반명_세부분류 패턴)
    if (!best) {
      const { data: pref } = await sb
        .from("foods")
        .select("food_id, official_name")
        .or(`official_name.ilike.${name}\\_%,official_name.ilike.${name} %`)
        .limit(50);
      if (pref && pref.length > 0) {
        best = pref.sort((a, b) => a.official_name.length - b.official_name.length)[0];
      }
    }

    // 3) 포함 매칭 (오염어 제외)
    if (!best) {
      const { data: loose } = await sb
        .from("foods")
        .select("food_id, official_name")
        .ilike("official_name", `%${name}%`)
        .limit(100);
      const EXCLUDE = ["햄버거", "피자", "샌드위치", "덮밥", "주먹밥", "도시락", "(R)", "(S)", "(L)"];
      const filtered = (loose ?? []).filter(
        (r) => !EXCLUDE.some((w) => r.official_name.includes(w)),
      );
      if (filtered.length > 0) {
        best = filtered.sort((a, b) => a.official_name.length - b.official_name.length)[0];
      }
    }

    if (!best) {
      missing.push(name);
      continue;
    }

    const { error } = await sb.from("food_aliases").insert({
      alias: name,
      food_id: best.food_id,
    });
    if (error) {
      console.error(`  ✗ ${name}: ${error.message}`);
      continue;
    }
    console.log(`  + ${name} → ${best.official_name} (${best.food_id})`);
    added++;
  }

  console.log(`\n추가: ${added} · 이미있음: ${skipped} · 매칭실패: ${missing.length}`);
  if (missing.length > 0) console.log("  실패:", missing.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
