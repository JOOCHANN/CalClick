"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Loader2, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";

const NICKNAME_RE = /^[가-힣A-Za-z0-9_.-]+$/;

type Profile = {
  nickname: string | null;
  nickname_changed_at: string | null;
};

function hoursUntilAvailable(changedAt: string | null): number {
  if (!changedAt) return 0;
  const diff = 24 - (Date.now() - new Date(changedAt).getTime()) / 36e5;
  return Math.max(0, diff);
}

export default function NicknameSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/profile");
      if (res.ok && !cancelled) {
        const { profile: p } = (await res.json()) as { profile: Profile | null };
        setProfile(p);
        setValue(p?.nickname ?? "");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const v = value.trim();
    setAvailable(null);
    setReason(null);
    if (v.length === 0 || v === (profile?.nickname ?? "")) return;
    if (v.length < 2 || v.length > 20) {
      setReason("2–20자로 입력해 주세요");
      return;
    }
    if (!NICKNAME_RE.test(v)) {
      setReason("한글·영문·숫자·_.- 만 가능해요");
      return;
    }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`/api/profile/nickname-check?name=${encodeURIComponent(v)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; reason: string | null };
        setAvailable(data.ok);
        setReason(data.ok ? null : data.reason === "taken" ? "이미 사용 중인 닉네임이에요" : "사용할 수 없는 닉네임이에요");
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value, profile?.nickname]);

  const waitH = hoursUntilAvailable(profile?.nickname_changed_at ?? null);
  const locked = waitH > 0;
  const isSame = value.trim() === (profile?.nickname ?? "");

  const save = async () => {
    const v = value.trim();
    if (!v || isSame || available !== true) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: v }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        toast.error(`하루 1회만 변경할 수 있어요 · ${data.retry_in_hours ?? "잠시"}시간 후 가능`);
        return;
      }
      if (res.status === 409) {
        toast.error("이미 사용 중인 닉네임이에요");
        return;
      }
      if (!res.ok) {
        toast.error("저장 실패");
        return;
      }
      toast.success("닉네임이 변경됐어요");
      router.replace("/settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link
          href="/settings"
          className="p-2 -ml-2 rounded-full hover:bg-brand-50 text-ink-500"
          aria-label="뒤로"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">닉네임 변경</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-500">새 닉네임</span>
              <div className="relative">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="2–20자 · 한글·영문·숫자·_.-"
                  maxLength={20}
                  autoFocus
                  disabled={locked}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-500" />}
                  {!checking && available === true && (
                    <Check className="w-4 h-4 text-mint-600" />
                  )}
                  {!checking && available === false && <X className="w-4 h-4 text-brand-600" />}
                </span>
              </div>
            </label>
            <p className="text-[11px] min-h-[14px]">
              {reason ? (
                <span className="text-brand-600">{reason}</span>
              ) : available === true ? (
                <span className="text-mint-600">사용 가능한 닉네임이에요</span>
              ) : (
                <span className="text-ink-500">
                  현재 닉네임: {profile?.nickname ?? "없음"}
                </span>
              )}
            </p>
          </section>

          <section className="rounded-2xl bg-cream-50 px-4 py-3 flex flex-col gap-1 text-[11px] text-ink-700">
            <p>· 닉네임은 하루에 한 번만 변경할 수 있어요.</p>
            <p>· 다른 사용자와 같은 닉네임은 사용할 수 없어요.</p>
            {locked && (
              <p className="text-brand-600 font-medium">
                · 다음 변경까지 {Math.ceil(waitH)}시간 남았어요
              </p>
            )}
          </section>

          <Button
            onClick={save}
            disabled={saving || locked || isSame || available !== true}
            className="mt-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "변경하기"}
          </Button>
        </>
      )}

      <Toaster position="top-center" />
    </main>
  );
}
