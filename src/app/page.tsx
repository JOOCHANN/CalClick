"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { resizeImage } from "@/lib/image-resize";
import { supabaseBrowser } from "@/services/supabase";
import type { RecognitionResult } from "@/types/recognition";

type Candidate = RecognitionResult["candidates"][number];
type EditableCandidate = Candidate & { editedGrams: number };

function snap(g: number): number {
  return Math.max(50, Math.round(g / 50) * 50);
}

function previewKcal(c: EditableCandidate): number | null {
  if (c.kcal_per_100g == null) return null;
  return Math.round((c.kcal_per_100g * c.editedGrams) / 100);
}

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<EditableCandidate[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [todayKcal, setTodayKcal] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchToday = useCallback(async () => {
    const { from, to } = todayRange();
    const res = await fetch(`/api/meals/today?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (!res.ok) return;
    const data = await res.json();
    setTodayKcal(data.total_kcal ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchToday();
  }, [fetchToday]);

  const onSave = async () => {
    if (!candidates) return;
    const picked = candidates[selectedIdx];
    if (!picked) return;
    if (!picked.food_id) {
      toast.error(`인식되지 않은 음식: ${picked.name}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: [{ name: picked.name, grams: picked.editedGrams }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "unknown_foods") {
          toast.error(`인식되지 않은 음식: ${data.unknown.join(", ")}`);
        } else if (data.error === "unauthorized") {
          toast.error("로그인이 필요합니다");
          location.href = "/login";
        } else {
          toast.error("저장 실패");
        }
        return;
      }
      setCandidates(null);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      toast.success(`+${data.total_kcal} kcal 저장됨`);
      fetchToday();
    } finally {
      setSaving(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setCandidates(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const blob = await resizeImage(file);
      const form = new FormData();
      form.append("image", blob, "meal.jpg");
      const res = await fetch("/api/recognize", { method: "POST", body: form });
      if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
      const data: RecognitionResult = await res.json();
      setCandidates(
        data.candidates.map((c) => ({ ...c, editedGrams: snap(c.grams) })),
      );
      setSelectedIdx(0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "인식에 실패했어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">CalClick</h1>
        <button
          type="button"
          onClick={async () => {
            await supabaseBrowser().auth.signOut();
            location.href = "/login";
          }}
          className="text-xs text-neutral-500 underline"
        >
          로그아웃
        </button>
      </header>

      <section className="flex flex-col items-center py-4">
        <span className="text-xs text-neutral-500">오늘 섭취</span>
        <span className="text-5xl font-semibold tabular-nums text-green-600">
          {todayKcal}
        </span>
        <span className="text-xs text-neutral-500">kcal</span>
      </section>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-col gap-3">
        {previewUrl ? (
          <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="선택한 사진" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 flex flex-col items-center justify-center gap-2 hover:bg-neutral-50"
          >
            <Camera className="w-8 h-8" />
            <span>사진 촬영 / 선택</span>
          </button>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? "다시 선택" : "사진 선택"}
          </Button>
          <Button className="flex-1" onClick={onAnalyze} disabled={!file || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "분석"}
          </Button>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-4 flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      )}

      {candidates && (
        <section className="flex flex-col gap-3">
          <Button size="lg" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "오늘 식사에 저장"}
          </Button>
          {candidates.map((c, i) => {
            const kcal = previewKcal(c);
            const selected = i === selectedIdx;
            return (
              <Card
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`cursor-pointer transition ${
                  selected
                    ? "border-green-600 border-2"
                    : c.food_id
                      ? "opacity-60"
                      : "opacity-60 border-amber-400"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-baseline gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block w-4 h-4 rounded-full border-2 ${
                          selected ? "border-green-600 bg-green-600" : "border-neutral-300"
                        }`}
                      />
                      {c.name}
                    </span>
                    <span className="text-2xl tabular-nums text-green-600">
                      {kcal == null ? "?" : `${kcal} kcal`}
                    </span>
                  </CardTitle>
                </CardHeader>
                {selected && (
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex justify-between text-sm text-neutral-500">
                      <span>중량</span>
                      <span className="tabular-nums">{c.editedGrams} g</span>
                    </div>
                    <Slider
                      min={50}
                      max={800}
                      step={50}
                      value={[c.editedGrams]}
                      onValueChange={(v) => {
                        const next = Array.isArray(v) ? v[0] : v;
                        setCandidates((prev) =>
                          prev
                            ? prev.map((p, pi) =>
                                pi === i ? { ...p, editedGrams: next } : p,
                              )
                            : prev,
                        );
                      }}
                    />
                    <div className="text-xs text-neutral-400">
                      신뢰도 {(c.confidence * 100).toFixed(0)}%
                      {!c.food_id && " · DB에 없는 음식"}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </section>
      )}

      <Toaster position="top-center" />
    </main>
  );
}
