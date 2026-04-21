"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", Icon: Home },
  { href: "/me", label: "기록", Icon: Calendar },
  { href: "/settings", label: "설정", Icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      aria-label="하단 네비게이션"
    >
      <div className="mx-auto max-w-md px-4 pb-2 pt-1">
        <div className="rounded-full bg-white/90 backdrop-blur-xl shadow-[0_8px_24px_-4px_rgba(255,138,149,0.25)] ring-1 ring-brand-100/60 flex items-stretch">
          {TABS.map(({ href, label, Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition active:scale-95 ${
                  active ? "text-brand-600" : "text-ink-500 hover:text-brand-500"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span className={`text-[10px] ${active ? "font-semibold" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
