"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "./TabBar";

const HIDE_ON = ["/login", "/signup", "/privacy"];

export function TabBarGate() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  return <TabBar />;
}
