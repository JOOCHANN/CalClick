"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { resizeImage } from "@/lib/image-resize";
import { supabaseBrowser } from "@/services/supabase";
import type { FoodCandidate, RecognitionResult } from "@/types/recognition";

type EditableCandidate = FoodCandidate & { editedGrams: number };
type EditableItem = {
  label: string | null;
  candidates: EditableCandidate[];
  selectedIdx: number;
  included: boolean;
};

function snap(g: number): number {
  return Math.max(50, Math.round(g / 50) * 50);
}

function candKcal(c: EditableCandidate): number | null {
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
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [shareCount, setShareCount] = useState<number>(1);
  const [todayKcal, setTodayKcal] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchToday = useCallback(async () => {
    const { from, to } = todayRange();
    const res = await fetch(
      `/api/meals/today?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!res.ok) return;
    const data = await res.json();
    setTodayKcal(data.total_kcal ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchToday();
  }, [fetchToday]);

  const rawTotal = items
    ? items
        .filter((it) => it.included)
        .reduce((sum, it) => sum + (candKcal(it.candidates[it.selectedIdx]) ?? 0), 0)
    : 0;
  const totalPreview = Math.round(rawTotal / shareCount);

  const onSave = async () => {
    if (!items) return;
    const selected = items
      .filter((it) => it.included)
      .map((it) => it.candidates[it.selectedIdx]);
    if (selected.length === 0) {
      toast.error("저장할 음식을 하나 이상 선택해 주세요");
      return;
    }
    const unknown = selected.filter((c) => !c.food_id).map((c) => c.name);
    if (unknown.length > 0) {
      toast.error(`인식되지 않은 음식: ${unknown.join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: selected.map((c) => ({ name: c.name, grams: c.editedGrams })),
          shareCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "unknown_foods") {
          toast.error(`인식되지 않은 음식: ${data.unknown.join(", ")}`);
        } else if (data.error === "unauthorized") {
          toast.error("로그인이 필요합니다");
          location.href = "/login";
        } else if (data.error === "rate_limited") {
          toast.error("요청이 너무 많아요. 잠시 후 다시 시도해주세요");
        } else {
          toast.error("저장 실패");
        }
        return;
      }
      setItems(null);
      setShareCount(1);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      toast.success(
        shareCount > 1
          ? `${shareCount}명 공유: +${data.total_kcal} kcal 저장됨`
          : `+${data.total_kcal} kcal 저장됨`,
      );
      fetchToday();
    } finally {
      setSaving(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setItems(null);
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
      if (res.status === 401) {
        location.href = "/login";
        return;
      }
      if (res.status === 429) {
        toast.error("요청이 너무 많아요. 잠시 후 다시 시도해주세요");
        return;
      }
      if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
      const data: RecognitionResult = await res.json();
      setItems(
        data.items.map((it) => ({
          label: it.label ?? null,
          candidates: it.candidates.map((c) => ({ ...c, editedGrams: snap(c.grams) })),
          selectedIdx: 0,
          included: true,
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "인식에 실패했어요");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<EditableItem>) => {
    setItems((prev) =>
      prev ? prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)) : prev,
    );
  };

  const updateCandidate = (itemIdx: number, candIdx: number, patch: Partial<EditableCandidate>) => {
    setItems((prev) =>
      prev
        ? prev.map((it, i) =>
            i === itemIdx
              ? {
                  ...it,
                  candidates: it.candidates.map((c, ci) =>
                    ci === candIdx ? { ...c, ...patch } : c,
                  ),
                }
              : it,
          )
        : prev,
    );
  };

  return (
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">CalClick</h1>
        <div className="flex gap-3 text-xs text-neutral-500">
          <Link href="/settings" className="underline">설정</Link>
          <button
            type="button"
            onClick={async () => {
              await supabaseBrowser().auth.signOut();
              location.href = "/login";
            }}
            className="underline"
          >
            로그아웃
          </button>
        </div>
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

      {items && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-600">함께 먹는 인원</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShareCount(n)}
                    className={`w-9 h-9 rounded-full text-sm font-medium tabular-nums ${
                      shareCount === n
                        ? "bg-green-600 text-white"
                        : "bg-white border border-neutral-200 text-neutral-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-neutral-600">
                내 섭취 {shareCount > 1 && `(÷${shareCount})`}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-green-600">
                {totalPreview} kcal
              </span>
            </div>
          </div>
          <Button size="lg" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "오늘 식사에 저장"}
          </Button>

          {items.map((it, itIdx) => {
            const picked = it.candidates[it.selectedIdx];
            const pickedKcal = candKcal(picked);
            return (
              <section key={itIdx} className={`flex flex-col gap-2 ${it.included ? "" : "opacity-50"}`}>
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={it.included}
                      onChange={(e) => updateItem(itIdx, { included: e.target.checked })}
                    />
                    <span>{it.label ?? `음식 ${itIdx + 1}`}</span>
                  </label>
                  <span className="text-sm tabular-nums text-green-600">
                    {pickedKcal == null ? "?" : `${pickedKcal} kcal`}
                  </span>
                </div>

                {it.candidates.map((c, cIdx) => {
                  const selected = cIdx === it.selectedIdx;
                  const kcal = candKcal(c);
                  return (
                    <Card
                      key={cIdx}
                      onClick={() => updateItem(itIdx, { selectedIdx: cIdx })}
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
                          <span className="text-lg tabular-nums text-green-600">
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
                              updateCandidate(itIdx, cIdx, { editedGrams: next });
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
            );
          })}
        </section>
      )}

      <Toaster position="top-center" />
    </main>
  );
}
