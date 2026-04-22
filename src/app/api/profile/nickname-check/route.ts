import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";
import { supabaseAdmin } from "@/services/supabase-admin";

const NICKNAME_RE = /^[가-힣A-Za-z0-9_.-]+$/;

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const name = (new URL(request.url).searchParams.get("name") ?? "").trim();
  if (!name || name.length < 2 || name.length > 20 || !NICKNAME_RE.test(name)) {
    return NextResponse.json({ ok: false, reason: "invalid" });
  }
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .ilike("nickname", name)
    .neq("id", user.id)
    .maybeSingle();
  return NextResponse.json({ ok: !data, reason: data ? "taken" : null });
}
