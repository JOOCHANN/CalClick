import { NextResponse } from "next/server";
import { getOpenAI } from "@/services/openai";
import { RecognitionResult } from "@/types/recognition";
import { findFoodsByAliases } from "@/services/foods";
import { supabaseServer } from "@/services/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "너는 한식 영양 분석 전문가다. 한상차림 사진에서 **각 음식(국·밥·반찬·메인 등)**을 모두 찾아, 각 음식에 대해 상위 후보를 JSON으로만 답하라.";

const USER_PROMPT = `{"items":[{"label":"국/밥/반찬/메인 중 하나 또는 null","candidates":[{"name":"한국어 음식명","grams":추정 중량 g,"confidence":0-1}]}]} 형식으로만 반환.
- items는 사진에 실제로 보이는 서로 다른 음식마다 하나씩 (한상차림이면 1~6개, 단일 음식이면 1개).
- 각 item의 candidates는 그 음식의 top 1~3 후보.
- 기준물(숟가락 15cm, 밥공기 직경 10cm)이 보이면 중량 반영.
- 같은 그릇의 음식을 여러 item으로 쪼개지 말 것. 다른 그릇/다른 반찬은 각자 별도 item.`;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkRateLimit(`recognize:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const image = form?.get("image");
  if (!image || !(image instanceof Blob)) {
    return NextResponse.json({ error: "image field required" }, { status: 400 });
  }

  const buf = Buffer.from(await image.arrayBuffer());
  const mime = image.type || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: USER_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("recognize: JSON.parse fail", raw);
    return NextResponse.json({ error: "invalid JSON from model" }, { status: 502 });
  }

  const result = RecognitionResult.safeParse(parsed);
  if (!result.success) {
    console.error("recognize: schema fail", raw, result.error.flatten());
    return NextResponse.json({ error: "schema validation failed" }, { status: 502 });
  }

  const allNames = result.data.items.flatMap((it) => it.candidates.map((c) => c.name));
  const map = await findFoodsByAliases(allNames);
  const enrichedItems = result.data.items.map((it) => ({
    label: it.label ?? null,
    candidates: it.candidates.map((c) => {
      const f = map.get(c.name.trim());
      return {
        ...c,
        food_id: f?.food_id ?? null,
        kcal_per_100g: f?.kcal_per_100g ?? null,
      };
    }),
  }));
  return NextResponse.json({ items: enrichedItems });
}
