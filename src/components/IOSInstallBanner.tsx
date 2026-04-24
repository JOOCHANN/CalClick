"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "calclick:ios-install-dismissed-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (!isIOS) return;
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;
    const dismissedAt = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;
    const t = window.setTimeout(() => setShow(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed left-3 right-3 bottom-24 z-40">
      <div className="rounded-2xl bg-white/95 backdrop-blur ring-1 ring-brand-200 shadow-lg p-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-lg shrink-0">📱</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink-900">홈 화면에 CalClick 추가하기</p>
          <p className="text-[11px] text-ink-500 mt-0.5 leading-relaxed">
            공유 <span className="inline-block px-1 py-px rounded bg-brand-50 text-brand-600 font-medium">⎋</span> → &ldquo;홈 화면에
            추가&rdquo;를 누르면 앱처럼 써요.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="닫기"
          className="p-1 rounded-full text-ink-500 hover:bg-cream-100 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
