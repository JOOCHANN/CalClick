import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM required" }, { status: 400 });
  }
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);

  const { data, error } = await supabase
    .from("meals")
    .select("id, eaten_at, total_kcal, photo_path")
    .gte("eaten_at", from.toISOString())
    .lt("eaten_at", to.toISOString())
    .not("photo_path", "is", null)
    .order("eaten_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data ?? []).filter((r) => r.photo_path);
  const signed = await Promise.all(
    entries.map(async (r) => {
      const { data: sig } = await supabase.storage
        .from("meal-photos")
        .createSignedUrl(r.photo_path as string, 600);
      return {
        meal_id: r.id,
        eaten_at: r.eaten_at,
        total_kcal: r.total_kcal,
        url: sig?.signedUrl ?? null,
      };
    }),
  );
  return NextResponse.json({ photos: signed.filter((p) => p.url) });
}
