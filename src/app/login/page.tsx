"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/services/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-center">로그인</h1>
        <Input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          minLength={6}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "로그인 중…" : "로그인"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        계정이 없으신가요?{" "}
        <Link href="/signup" className="text-green-600 underline font-medium">
          가입
        </Link>
      </p>
      <Toaster position="top-center" />
    </main>
  );
}
