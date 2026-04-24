import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabaseServer } from "@/services/supabase-server";
import { FollowList } from "@/components/FollowList";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname: rawNick } = await params;
  const nickname = decodeURIComponent(rawNick ?? "").trim();
  const supabase = await supabaseServer();

  const { data: profRows } = await supabase.rpc("public_profile", {
    p_nickname: nickname,
  });
  const profile = (Array.isArray(profRows) ? profRows[0] : profRows) as
    | { id: string; nickname: string }
    | null;
  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <Link
          href={`/u/${profile.nickname}`}
          className="p-1.5 rounded-full text-ink-500 hover:bg-brand-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">
          @{profile.nickname} <span className="text-ink-500">팔로잉</span>
        </h1>
      </header>
      <FollowList
        nickname={profile.nickname}
        kind="following"
        viewerId={user?.id ?? null}
      />
    </main>
  );
}
