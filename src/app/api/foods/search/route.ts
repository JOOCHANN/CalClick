import { NextResponse } from "next/server";
import { findFoodCandidatesForName } from "@/services/foods";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  const results = await findFoodCandidatesForName(q, 10);
  return NextResponse.json({ results });
}
