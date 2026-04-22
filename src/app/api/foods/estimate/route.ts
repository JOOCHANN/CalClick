import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/services/supabase-server";
import { getOpenAI } from "@/services/openai";
import { checkRateLimit } from "@/lib/rate-limit";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

const EstimateSchema = z.object({
  kcal_per_100g: z.number().nonnegative().max(900),
});

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkRateLimit(`estimate:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { name } = parsed.data;

  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You estimate kcal per 100g for Korean foods. Return strict JSON { kcal_per_100g: number }. If the name is too vague, pick the most typical variant. Range 0-900.",
      },
      { role: "user", content: `음식: ${name}` },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const data = EstimateSchema.safeParse(JSON.parse(raw));
  if (!data.success) {
    return NextResponse.json({ error: "estimate_failed" }, { status: 502 });
  }
  return NextResponse.json({ kcal_per_100g: Math.round(data.data.kcal_per_100g) });
}
