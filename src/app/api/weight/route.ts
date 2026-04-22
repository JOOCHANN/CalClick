import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/services/supabase-server";

const PostSchema = z.object({
  weight_kg: z.number().min(20).max(400),
  logged_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 90)));
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const fromKey = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(
    from.getDate(),
  ).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("weight_logs")
    .select("logged_on, weight_kg")
    .gte("logged_on", fromKey)
    .order("logged_on", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const logged_on = parsed.data.logged_on ?? todayKey();
  const { error } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: user.id,
        logged_on,
        weight_kg: parsed.data.weight_kg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,logged_on" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("profiles")
    .update({ current_weight_kg: parsed.data.weight_kg })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
