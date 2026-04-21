"use client";

import { useState } from "react";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabaseBrowser } from "@/services/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error("개인정보 수집·처리에 동의해 주세요");
      return;
    }
    setLoading(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      await supabase
        .from("profiles")
        .update({ privacy_accepted_at: new Date().toISOString() })
        .eq("id", data.session.user.id);
      location.href = "/";
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">이메일을 확인해 주세요</h1>
        <p className="mt-2 text-sm text-neutral-500">
          받은편지함의 확인 링크를 누르면 가입이 완료됩니다.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-center">가입</h1>
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
          placeholder="비밀번호 (최소 6자)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          minLength={6}
        />
        <label className="flex items-start gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>
            식사 사진·기록 수집 및 처리에 동의합니다 (앱 사용 목적, 계정 삭제 시 즉시 파기).{" "}
            <Link href="/privacy" className="text-green-600 underline">
              자세히
            </Link>
          </span>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "가입 중…" : "가입"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-green-600 underline font-medium">
          로그인
        </Link>
      </p>
      <Toaster position="top-center" />
    </main>
  );
}
