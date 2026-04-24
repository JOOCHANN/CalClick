import { NextResponse } from "next/server";
import { supabaseServer } from "@/services/supabase-server";

type PublicProfile = {
  id: string;
  nickname: string;
  avatar_emoji: string | null;
  avatar_url: string | null;
  bio: string | null;
};
type PublicStats = {
  total_days: number;
  current_streak: number;
  followers_count: number;
  following_count: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ nickname: string }> },
) {
  const { nickname: rawNick } = await params;
  const nickname = decodeURIComponent(rawNick ?? "").trim();
  if (!nickname || nickname.length > 20) {
    return NextResponse.json({ error: "invalid_nickname" }, { status: 400 });
  }

  const supabase = await supabaseServer();

  const { data: profRows, error: profErr } = await supabase.rpc("public_profile", {
    p_nickname: nickname,
  });
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }
  const profile: PublicProfile | null = Array.isArray(profRows)
    ? (profRows[0] ?? null)
    : (profRows as PublicProfile | null);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: statsRows, error: statsErr } = await supabase.rpc("public_stats", {
    p_user_id: profile.id,
  });
  if (statsErr) {
    return NextResponse.json({ error: statsErr.message }, { status: 500 });
  }
  const stats: PublicStats | null = Array.isArray(statsRows)
    ? (statsRows[0] ?? null)
    : (statsRows as PublicStats | null);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let viewer_is_following = false;
  let is_self = false;
  if (user) {
    is_self = user.id === profile.id;
    if (!is_self) {
      const { data: rel } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followee_id", profile.id)
        .maybeSingle();
      viewer_is_following = !!rel;
    }
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      nickname: profile.nickname,
      avatar_emoji: profile.avatar_emoji,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
    },
    stats: {
      total_days: stats?.total_days ?? 0,
      current_streak: stats?.current_streak ?? 0,
      followers_count: stats?.followers_count ?? 0,
      following_count: stats?.following_count ?? 0,
    },
    viewer_is_following,
    is_self,
  });
}
