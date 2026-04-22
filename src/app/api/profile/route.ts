import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/services/supabase-server";
import { supabaseAdmin } from "@/services/supabase-admin";
import { computeTargets } from "@/lib/calorie-targets";

const NICKNAME_RE = /^[가-힣A-Za-z0-9_.-]+$/;

const PatchSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(NICKNAME_RE)
    .nullable()
    .optional(),
  sex: z.enum(["male", "female"]).nullable().optional(),
  birth_year: z.number().int().min(1900).max(2100).nullable().optional(),
  height_cm: z.number().min(50).max(250).nullable().optional(),
  current_weight_kg: z.number().min(20).max(400).nullable().optional(),
  activity_level: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .nullable()
    .optional(),
  goal_type: z.enum(["cut", "maintain", "bulk"]).nullable().optional(),
  goal_kcal: z.number().int().min(800).max(6000).nullable().optional(),
  goal_auto: z.boolean().optional(),
  finish_onboarding: z.boolean().optional(),
});

const PROFILE_COLS =
  "nickname, nickname_changed_at, sex, birth_year, height_cm, current_weight_kg, activity_level, goal_kcal, goal_type, goal_auto, onboarded_at, privacy_accepted_at";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data ?? null });
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { finish_onboarding, ...patch } = parsed.data;

  const { data: current } = await supabase
    .from("profiles")
    .select(
      "nickname, nickname_changed_at, sex, birth_year, height_cm, current_weight_kg, activity_level, goal_type, goal_auto, goal_kcal",
    )
    .eq("id", user.id)
    .maybeSingle();

  const merged = { ...(current ?? {}), ...patch };
  const update: Record<string, unknown> = { ...patch };

  if ("nickname" in patch && patch.nickname != null) {
    const next = patch.nickname.trim();
    const prev = (current?.nickname ?? "").trim();
    if (next !== prev) {
      if (current?.nickname_changed_at) {
        const last = new Date(current.nickname_changed_at).getTime();
        const hoursSince = (Date.now() - last) / 36e5;
        if (hoursSince < 24) {
          const waitH = Math.max(1, Math.ceil(24 - hoursSince));
          return NextResponse.json(
            { error: "nickname_rate_limited", retry_in_hours: waitH },
            { status: 429 },
          );
        }
      }
      const admin = supabaseAdmin();
      const { data: dup } = await admin
        .from("profiles")
        .select("id")
        .ilike("nickname", next)
        .neq("id", user.id)
        .maybeSingle();
      if (dup) {
        return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
      }
      update.nickname = next;
      update.nickname_changed_at = new Date().toISOString();
    } else {
      delete update.nickname;
    }
  }

  const canAuto =
    merged.sex &&
    merged.birth_year &&
    merged.height_cm &&
    merged.current_weight_kg &&
    merged.activity_level &&
    merged.goal_type;
  const autoFlag = patch.goal_auto ?? merged.goal_auto ?? true;
  if (canAuto && autoFlag && !("goal_kcal" in patch)) {
    const { goalKcal } = computeTargets({
      sex: merged.sex as "male" | "female",
      birthYear: merged.birth_year as number,
      heightCm: Number(merged.height_cm),
      weightKg: Number(merged.current_weight_kg),
      activity: merged.activity_level as
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active",
      goal: merged.goal_type as "cut" | "maintain" | "bulk",
    });
    update.goal_kcal = goalKcal;
  }

  if (finish_onboarding) {
    update.onboarded_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "nickname_taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, applied: update });
}
