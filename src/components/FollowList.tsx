"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FollowButton } from "./FollowButton";

type Item = {
  id: string;
  nickname: string;
  avatar_emoji: string | null;
  followed_at: string;
  viewer_is_following: boolean;
};

type Props = {
  nickname: string;
  kind: "followers" | "following";
  viewerId: string | null;
};

export function FollowList({ nickname, kind, viewerId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const url = new URL(
        `/api/u/${encodeURIComponent(nickname)}/${kind}`,
        window.location.origin,
      );
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url.toString());
      if (!res.ok) {
        setDone(true);
        return;
      }
      const data = (await res.json()) as {
        items: Item[];
        next_cursor: string | null;
      };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.next_cursor);
      if (!data.next_cursor) setDone(true);
    } finally {
      setLoading(false);
    }
  }, [nickname, kind, cursor, loading, done]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void load();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  if (!loading && items.length === 0 && done) {
    return (
      <div className="rounded-2xl bg-cream-50 py-12 flex flex-col items-center gap-2 text-ink-500">
        <span className="text-2xl">🫧</span>
        <span className="text-xs">
          {kind === "followers" ? "아직 팔로워가 없어요" : "아직 팔로잉이 없어요"}
        </span>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => {
        const isSelf = viewerId && it.id === viewerId;
        return (
          <li
            key={it.id}
            className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-brand-100/60 px-3 py-2.5 shadow-[0_4px_12px_-8px_rgba(255,138,149,0.2)]"
          >
            <Link
              href={`/u/${it.nickname}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cream-100 to-brand-100 flex items-center justify-center text-lg ring-1 ring-brand-100 shrink-0">
                {it.avatar_emoji ?? "🍚"}
              </span>
              <span className="text-sm font-semibold text-ink-900 truncate">
                @{it.nickname}
              </span>
            </Link>
            {viewerId && !isSelf && (
              <FollowButton
                followeeId={it.id}
                initialFollowing={it.viewer_is_following}
                size="sm"
              />
            )}
          </li>
        );
      })}
      <div ref={sentinelRef} className="h-4" />
      {loading && (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        </div>
      )}
    </ul>
  );
}
