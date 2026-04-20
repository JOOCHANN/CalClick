"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { resizeImage } from "@/lib/image-resize";
import { kcalFor } from "@/lib/kcal-temp";
import type { RecognitionResult } from "@/types/recognition";

type Candidate = RecognitionResult["candidates"][number];
type EditableCandidate = Candidate & { editedGrams: number };

function snap(g: number): number {
  return Math.max(50, Math.round(g / 50) * 50);
}

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<EditableCandidate[] | null>(null);

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
        <span className="text-xs text-neutral-500">한상 1장 · kcal</span>
      </header>

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
          {candidates.map((c, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex justify-between items-baseline">
                  <span>{c.name}</span>
                  <span className="text-2xl tabular-nums text-[var(--accent)]">
                    {kcalFor(c.name, c.editedGrams)} kcal
                  </span>
                </CardTitle>
              </CardHeader>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Toaster position="top-center" />
    </main>
  );
}
