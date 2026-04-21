import { NextResponse } from "next/server";
import { getOpenAI } from "@/services/openai";
import { RecognitionResult } from "@/types/recognition";
import { findFoodsByAliases } from "@/services/foods";
import { supabaseServer } from "@/services/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `너는 음식 사진 영양 분석 전문가다. 한국에서 실제로 먹는 모든 요리(한식·일식·중식·양식·디저트·음료·간식)를 다룬다. 사진 속 각 음식을 식별해, **식약처 공식 DB에서 검색되는 구체적 한국어 이름**으로 JSON만 반환하라.`;

const USER_PROMPT = `반환 형식(JSON만, 설명 금지):
{"items":[{"label":"분류","candidates":[{"name":"구체명","grams":정수,"kcal_per_100g":정수,"confidence":0-1}]}]}

[분류 label] — 아래 중 가장 맞는 하나:
  "밥/면", "국/찌개", "반찬", "메인", "일식", "중식", "양식", "디저트", "음료", "간식"

[구체명 규칙 — 매우 중요]
  식약처 DB는 구체적 이름으로만 등록돼 있다. 제네릭 이름 금지, 아래 예시처럼 구체화할 것:
    한식:  "김치" → "배추김치", "불고기" → "소불고기" 또는 "돼지불고기", "된장국" → "된장찌개" 또는 "근대된장국"
    음료:  "라떼" → "카페라떼", "커피" → "아메리카노" (사진에 맞게), "차" → "녹차"/"홍차"
    디저트: "케이크" → "치즈케이크"/"초코케이크"/"생크림케이크", "쿠키" → "초코칩쿠키", "빵" → "식빵"/"크루아상"
    일식:  "라멘" → "돈코츠라멘"/"쇼유라멘", "초밥" → "연어초밥"/"참치초밥", "우동" → "가쯔오우동"
    중식:  "짜장면" 그대로, "마라탕" 그대로, "탕수육" → "소고기탕수육"/"새우탕수육"
    양식:  "피자" → "페퍼로니피자"/"마르게리타피자", "스테이크" → "안심스테이크", "파스타" → "토마토파스타"/"크림파스타"
  브랜드/수식어는 제거: "스타벅스 카페라떼" → "카페라떼", "맥도날드 빅맥" → "빅맥".

[중량 추정]
  기준물이 있으면 활용: 숟가락(15cm, 15g), 밥공기(직경 10cm, 밥 한 공기=210g), 포크(17cm), 머그컵(~250ml), 테이크아웃 커피(Tall 355ml / Grande 475ml).
  음료는 ml을 g로 간주해 grams에 입력.
  디저트 1조각: 케이크 약 120g, 쿠키 1개 약 20g, 도넛 1개 약 60g.

[kcal_per_100g]
  각 후보에 해당 음식의 일반적인 **100g당 kcal**을 정수로 반드시 포함. 모르면 동종 음식 평균 근사치. 공란·null·-1 금지.
  참고 평균: 밥 140, 국/찌개 40~80, 구이생선 200, 불고기 210, 볶음반찬 120, 김치류 20~30,
  파전 230, 계란요리 150, 케이크 350~420, 크림케이크 380, 쿠키 480, 초콜릿 550,
  카페라떼 60, 아메리카노 5, 피자 260, 파스타 170, 라멘 140, 짜장면 180, 탕수육 230.

[items 구성]
  - 사진에 보이는 서로 다른 음식마다 item 하나 (한상차림 1~6개, 단일 1개).
  - 같은 그릇은 쪼개지 말 것. 다른 그릇/반찬은 별도 item.
  - 각 item의 candidates는 top 1~3 (가장 가능성 높은 것 먼저). 이름이 애매하면 2~3개 제시.`;

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
      if (f) {
        return {
          ...c,
          food_id: f.food_id,
          kcal_per_100g: f.kcal_per_100g,
          source: "db" as const,
        };
      }
      const fallback = c.kcal_per_100g != null && c.kcal_per_100g > 0 ? c.kcal_per_100g : 150;
      return {
        ...c,
        food_id: null,
        kcal_per_100g: fallback,
        source: "llm" as const,
      };
    }),
  }));
  return NextResponse.json({ items: enrichedItems });
}
