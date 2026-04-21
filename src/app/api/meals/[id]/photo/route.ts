import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: meal, error } = await supabase
    .from("meals")
    .select("photo_path, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!meal || meal.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!meal.photo_path) {
    return NextResponse.json({ error: "no_photo" }, { status: 404 });
  }

  const { data: signed, error: e2 } = await supabase.storage
    .from("meal-photos")
    .createSignedUrl(meal.photo_path, 300);
  if (e2 || !signed) {
    return NextResponse.json({ error: e2?.message ?? "sign_failed" }, { status: 500 });
  }
  return NextResponse.json({ url: signed.signedUrl });
}
