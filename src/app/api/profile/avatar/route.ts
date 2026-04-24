import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!checkRateLimit(`avatar:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "image required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const type = file.type || "image/jpeg";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: type, upsert: false });
  if (upErr) {
    return NextResponse.json(
      { error: "upload_failed", detail: upErr.message },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = pub?.publicUrl ?? null;

  // 이전 아바타 경로 읽어와 업데이트 후 삭제 (베스트 에포트)
  const { data: prev } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updErr } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (prev?.avatar_url) {
    const prevPath = extractStoragePath(prev.avatar_url);
    if (prevPath) {
      await supabase.storage.from("avatars").remove([prevPath]);
    }
  }

  return NextResponse.json({ avatar_url: publicUrl, path });
}

export async function DELETE() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: prev } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (prev?.avatar_url) {
    const prevPath = extractStoragePath(prev.avatar_url);
    if (prevPath) await supabase.storage.from("avatars").remove([prevPath]);
  }

  return NextResponse.json({ ok: true });
}

function extractStoragePath(url: string): string | null {
  const marker = "/storage/v1/object/public/avatars/";
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}
