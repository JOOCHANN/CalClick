"use client";

import { useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "삭제 실패");
      setDeleting(false);
      return;
    }
    location.href = "/login";
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">설정</h1>
        <Link href="/" className="text-xs text-neutral-500 underline">
          홈
        </Link>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-700">개인정보</h2>
        <Link href="/privacy" className="text-sm text-green-600 underline">
          개인정보 처리방침
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-red-200 p-4">
        <h2 className="text-sm font-medium text-red-600">계정 삭제</h2>
        <p className="text-xs text-neutral-500">
          계정과 모든 식사 기록·사진이 즉시 영구 삭제됩니다. 복구할 수 없습니다.
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중…" : "영구 삭제"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-red-300 text-red-600"
            onClick={() => setConfirming(true)}
          >
            계정 삭제
          </Button>
        )}
      </section>

      <Toaster position="top-center" />
    </main>
  );
}
