"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus, UserCheck } from "lucide-react";

type Props = {
  followeeId: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
  size?: "sm" | "md";
};

export function FollowButton({
  followeeId,
  initialFollowing,
  onChange,
  size = "md",
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !following;
    // optimistic
    setFollowing(next);
    onChange?.(next);
    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followee_id: followeeId }),
      });
      if (!res.ok) {
        // revert
        setFollowing(!next);
        onChange?.(!next);
      }
    });
  };

  const padding = size === "sm" ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`rounded-full font-bold transition flex items-center gap-1 ${padding} ${
        following
          ? "bg-cream-100 text-ink-700 ring-1 ring-brand-100 hover:bg-brand-50"
          : "bg-brand-500 text-white shadow-sm hover:bg-brand-600"
      } disabled:opacity-60`}
    >
      {pending ? (
        <Loader2 className={size === "sm" ? "w-3 h-3 animate-spin" : "w-3.5 h-3.5 animate-spin"} />
      ) : following ? (
        <UserCheck className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      ) : (
        <UserPlus className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      )}
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
