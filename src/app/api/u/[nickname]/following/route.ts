import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

const PAGE_SIZE = 20;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ nickname: string }> },
) {
  const { nickname } = await params;
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");

  const supabase = await supabaseServer();

  const { data: profile, error: profErr } = await supabase
    .rpc("public_profile", { p_nickname: nickname })
    .maybeSingle<{ id: string; nickname: string }>();
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("public_following", {
    p_user_id: profile.id,
    p_viewer_id: user?.id ?? null,
    p_cursor: cursor,
    p_limit: PAGE_SIZE,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];
  const nextCursor =
    items.length === PAGE_SIZE ? items[items.length - 1].followed_at : null;

  return NextResponse.json({ items, next_cursor: nextCursor });
}
