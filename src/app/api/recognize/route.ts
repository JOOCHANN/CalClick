import { NextResponse } from "next/server";
import { getOpenAI } from "@/services/openai";
import { RecognitionResult } from "@/types/recognition";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "너는 한식 영양 분석 전문가다. 사진에서 음식을 찾아 상위 3개 후보를 JSON으로만 답하라.";

const USER_PROMPT =
  '{"candidates":[{"name":"한국어 음식명","grams":추정 중량,"confidence":0-1}]} 형식으로만 반환. 기준물(숟가락 15cm, 밥공기 직경 10cm)이 보이면 중량 반영. 후보는 1~5개.';

export async function POST(req: Request) {
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

  return NextResponse.json(result.data);
}
