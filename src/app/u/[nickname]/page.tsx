import Link from "next/link";
import { notFound } from "next/navigation";
import { Flame, Users, Calendar, Settings as SettingsIcon } from "lucide-react";
import { supabaseServer } from "@/services/supabase-server";
import { FollowButton } from "@/components/FollowButton";

type Profile = {
  id: string;
  nickname: string;
  avatar_emoji: string | null;
  bio: string | null;
};
type Stats = {
  total_days: number;
  current_streak: number;
  followers_count: number;
  following_count: number;
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .rpc("public_profile", { p_nickname: nickname })
    .maybeSingle<Profile>();
  if (!profile) notFound();

  const [{ data: stats }, authResult] = await Promise.all([
    supabase
      .rpc("public_stats", { p_user_id: profile.id })
      .maybeSingle<Stats>(),
    supabase.auth.getUser(),
  ]);

  const viewer = authResult.data.user;
  const isSelf = viewer?.id === profile.id;
  let viewerIsFollowing = false;
  if (viewer && !isSelf) {
    const { data: rel } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", viewer.id)
      .eq("followee_id", profile.id)
      .maybeSingle();
    viewerIsFollowing = !!rel;
  }

  const s = stats ?? {
    total_days: 0,
    current_streak: 0,
    followers_count: 0,
    following_count: 0,
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cream-100 to-brand-100 flex items-center justify-center text-3xl shrink-0 ring-1 ring-brand-100 shadow-[0_4px_12px_-4px_rgba(255,138,149,0.25)]">
          {profile.avatar_emoji ?? "🍚"}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black italic tracking-tight text-ink-900 truncate">
              @{profile.nickname}
            </h1>
            {isSelf ? (
              <Link
                href="/settings"
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-cream-100 text-ink-700 text-[11px] font-bold ring-1 ring-brand-100"
              >
                <SettingsIcon className="w-3 h-3" />
                편집
              </Link>
            ) : viewer ? (
              <FollowButton
                followeeId={profile.id}
                initialFollowing={viewerIsFollowing}
                size="sm"
              />
            ) : (
              <Link
                href={`/login?next=/u/${profile.nickname}`}
                className="px-3 py-1 rounded-full bg-brand-500 text-white text-[11px] font-bold"
              >
                로그인해서 팔로우
              </Link>
            )}
          </div>
          {profile.bio && (
            <p className="text-xs text-ink-700 whitespace-pre-wrap">{profile.bio}</p>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white ring-1 ring-brand-100/60 py-3 flex flex-col items-center gap-0.5 shadow-[0_4px_16px_-10px_rgba(255,138,149,0.25)]">
          <Calendar className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-lg font-black italic tabular-nums text-ink-900 leading-none mt-0.5">
            {s.total_days}
          </span>
          <span className="text-[10px] text-ink-500">기록일</span>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-brand-100/60 py-3 flex flex-col items-center gap-0.5 shadow-[0_4px_16px_-10px_rgba(255,138,149,0.25)]">
          <Flame className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-lg font-black italic tabular-nums text-ink-900 leading-none mt-0.5">
            {s.current_streak}
          </span>
          <span className="text-[10px] text-ink-500">스트릭</span>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-brand-100/60 py-3 flex flex-col items-center gap-0.5 shadow-[0_4px_16px_-10px_rgba(255,138,149,0.25)]">
          <Users className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-lg font-black italic tabular-nums text-ink-900 leading-none mt-0.5">
            {s.followers_count}
          </span>
          <span className="text-[10px] text-ink-500">팔로워</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link
          href={`/u/${profile.nickname}/followers`}
          className="rounded-2xl bg-cream-50 ring-1 ring-brand-100/60 px-4 py-3 flex items-center justify-between hover:bg-brand-50 transition"
        >
          <span className="text-xs font-semibold text-ink-700">팔로워</span>
          <span className="text-sm font-bold tabular-nums text-brand-600">
            {s.followers_count}
          </span>
        </Link>
        <Link
          href={`/u/${profile.nickname}/following`}
          className="rounded-2xl bg-cream-50 ring-1 ring-brand-100/60 px-4 py-3 flex items-center justify-between hover:bg-brand-50 transition"
        >
          <span className="text-xs font-semibold text-ink-700">팔로잉</span>
          <span className="text-sm font-bold tabular-nums text-brand-600">
            {s.following_count}
          </span>
        </Link>
      </section>

      <section className="rounded-2xl bg-cream-50 ring-1 ring-brand-100/40 px-4 py-6 flex flex-col items-center gap-1 text-center">
        <span className="text-2xl">🍱</span>
        <p className="text-xs text-ink-500">
          곧 {profile.nickname}님의 공유 식사가 여기에 올라와요
        </p>
        <p className="text-[10px] text-ink-500">v0.2-b에서 피드 공개 예정</p>
      </section>
    </main>
  );
}
