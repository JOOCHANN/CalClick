import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("meals")
    .select("total_kcal")
    .gte("eaten_at", from)
    .lt("eaten_at", to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const total = (data ?? []).reduce((s, r) => s + (r.total_kcal ?? 0), 0);
  return NextResponse.json({ total_kcal: total });
}
