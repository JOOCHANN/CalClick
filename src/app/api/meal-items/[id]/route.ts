import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/services/supabase-server";

const PatchSchema = z.object({
  kcal: z.number().nonnegative().max(10000).optional(),
  grams: z.number().positive().max(5000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("meal_items")
    .update(parsed.data)
    .eq("id", id)
    .select("meal_id")
    .single();
  if (error || !updated) {
    return NextResponse.json({ error: error?.message ?? "not_found" }, { status: 500 });
  }

  const { data: siblings, error: e2 } = await supabase
    .from("meal_items")
    .select("kcal")
    .eq("meal_id", updated.meal_id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  const total = (siblings ?? []).reduce((s, it) => s + (it.kcal ?? 0), 0);
  await supabase.from("meals").update({ total_kcal: total }).eq("id", updated.meal_id);

  return NextResponse.json({ ok: true, total_kcal: total });
}
