"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { resizeImage } from "@/lib/image-resize";
import { supabaseBrowser } from "@/services/supabase";
import type { FoodCandidate, RecognitionResult } from "@/types/recognition";

type EditableCandidate = FoodCandidate & { editedGrams: number; customKcalPer100g?: number };
type EditableItem = {
  label: string | null;
  candidates: EditableCandidate[];
  selectedIdx: number;
  included: boolean;
};

type TodayMeal = {
  id: string;
  eaten_at: string;
  meal_type: MealType | null;
  total_kcal: number;
  share_count: number;
  items: { id: string; name: string; grams: number; kcal: number }[];
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

function guessMealType(d = new Date()): MealType {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}

function formatToday(d = new Date()): string {
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${week})`;
}

function snap(g: number): number {
  return Math.max(50, Math.round(g / 50) * 50);
}

function effectiveKcalPer100g(c: EditableCandidate): number | null {
  if (c.kcal_per_100g != null) return c.kcal_per_100g;
  if (c.customKcalPer100g != null && c.customKcalPer100g > 0) return c.customKcalPer100g;
  return null;
}

function candKcal(c: EditableCandidate): number | null {
  const k = effectiveKcalPer100g(c);
  if (k == null) return null;
  return Math.round((k * c.editedGrams) / 100);
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
  const [mealType, setMealType] = useState<MealType>(() => guessMealType());
  const [todayKcal, setTodayKcal] = useState<number>(0);
  const [todayMeals, setTodayMeals] = useState<TodayMeal[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editKcal, setEditKcal] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const todayLabel = formatToday();

  const fetchToday = useCallback(async () => {
    const { from, to } = todayRange();
    const res = await fetch(
      `/api/meals/today?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    if (!res.ok) return;
    const data = await res.json();
    setTodayKcal(data.total_kcal ?? 0);
    setTodayMeals(data.meals ?? []);
  }, []);

  const onDeleteMeal = async (id: string) => {
    if (!confirm("이 식사를 삭제할까요?")) return;
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("삭제 실패");
      return;
    }
    toast.success("삭제됨");
    fetchToday();
  };

  const saveEdit = async (id: string) => {
    const n = Math.round(Number(editKcal));
    setEditingId(null);
    if (!Number.isFinite(n) || n < 0) return;
    const current = todayMeals.find((m) => m.id === id);
    if (!current || current.total_kcal === n) return;
    const res = await fetch(`/api/meals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total_kcal: n }),
    });
    if (!res.ok) {
      toast.error("수정 실패");
      return;
    }
    fetchToday();
  };

  const saveItemEdit = async (itemId: string, prevKcal: number) => {
    const n = Math.round(Number(editKcal));
    setEditingItemId(null);
    if (!Number.isFinite(n) || n < 0 || n === prevKcal) return;
    const res = await fetch(`/api/meal-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kcal: n }),
    });
    if (!res.ok) {
      toast.error("수정 실패");
      return;
    }
    fetchToday();
  };

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
    const savable = selected.filter((c) => c.food_id);
    const skipped = selected.filter((c) => !c.food_id).map((c) => c.name);
    if (savable.length === 0) {
      toast.error("저장 가능한 음식이 없어요 (DB 미등록 음식은 미리보기에만 계산됩니다)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: savable.map((c) => ({ name: c.name, grams: c.editedGrams })),
          shareCount,
          mealType,
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
      setMealType(guessMealType());
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      const prefix = `${MEAL_LABELS[mealType]} +${data.total_kcal} kcal 저장됨`;
      const base = shareCount > 1 ? `${prefix} (${shareCount}명 공유)` : prefix;
      toast.success(
        skipped.length > 0 ? `${base} (DB 미등록 제외: ${skipped.join(", ")})` : base,
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
        <span className="text-xs text-neutral-500">오늘 섭취 · {todayLabel}</span>
        <span className="text-5xl font-semibold tabular-nums text-green-600">
          {todayKcal}
        </span>
        <span className="text-xs text-neutral-500">kcal</span>
      </section>

      {todayMeals.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-700 px-1">오늘 먹은 것</h2>
          {todayMeals.map((m) => {
            const d = new Date(m.eaten_at);
            const time = `${d.getHours().toString().padStart(2, "0")}:${d
              .getMinutes()
              .toString()
              .padStart(2, "0")}`;
            const mealName = m.meal_type ? MEAL_LABELS[m.meal_type] : "식사";
            const open = expandedId === m.id;
            const editing = editingId === m.id;
            return (
              <Card key={m.id} className="overflow-hidden py-0 gap-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : m.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 text-xs px-2 py-0.5 shrink-0">
                      {mealName}
                    </span>
                    <span className="text-sm text-neutral-600 tabular-nums">{time}</span>
                    <span className="text-xs text-neutral-400 truncate">
                      {m.items.map((it) => it.name).join(", ")}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {editing ? (
                      <input
                        type="number"
                        autoFocus
                        value={editKcal}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditKcal(e.target.value)}
                        onBlur={() => saveEdit(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="w-20 text-right text-lg tabular-nums text-green-600 bg-transparent border-b border-green-600 outline-none"
                      />
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(m.id);
                          setEditKcal(m.total_kcal.toString());
                        }}
                        className="text-lg tabular-nums text-green-600 hover:underline"
                      >
                        {m.total_kcal} kcal
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeal(m.id);
                      }}
                      aria-label="삭제"
                      className="text-neutral-300 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="border-t px-4 py-3 flex flex-col gap-1 text-sm text-neutral-600">
                    {m.share_count > 1 && (
                      <div className="text-xs text-neutral-500 mb-1">{m.share_count}인 공유</div>
                    )}
                    {m.items.map((it) => {
                      const itemEditing = editingItemId === it.id;
                      return (
                        <div key={it.id} className="flex justify-between items-center">
                          <span>
                            {it.name}{" "}
                            <span className="text-neutral-400 text-xs">{it.grams}g</span>
                          </span>
                          {itemEditing ? (
                            <input
                              type="number"
                              autoFocus
                              value={editKcal}
                              onChange={(e) => setEditKcal(e.target.value)}
                              onBlur={() => saveItemEdit(it.id, it.kcal)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                                else if (e.key === "Escape") setEditingItemId(null);
                              }}
                              className="w-20 text-right tabular-nums text-neutral-700 bg-transparent border-b border-neutral-400 outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(it.id);
                                setEditKcal(it.kcal.toString());
                              }}
                              className="tabular-nums text-neutral-500 hover:underline"
                            >
                              {it.kcal} kcal
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </section>
      )}

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
          <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-600">끼니</span>
              <div className="flex gap-1">
                {(Object.keys(MEAL_LABELS) as MealType[]).map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMealType(mt)}
                    className={`px-3 h-9 rounded-full text-sm font-medium ${
                      mealType === mt
                        ? "bg-green-600 text-white"
                        : "bg-white border border-neutral-200 text-neutral-600"
                    }`}
                  >
                    {MEAL_LABELS[mt]}
                  </button>
                ))}
              </div>
            </div>
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

          {(() => {
            const groups = new Map<string, number[]>();
            items.forEach((it, idx) => {
              const key = it.label ?? "기타";
              const arr = groups.get(key) ?? [];
              arr.push(idx);
              groups.set(key, arr);
            });
            return [...groups.entries()].map(([label, idxs]) => (
              <section key={label} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-neutral-700 px-1">{label}</h3>
                {idxs.map((itIdx) => {
                  const it = items[itIdx];
                  const c = it.candidates[it.selectedIdx];
                  const kcal = candKcal(c);
                  return (
                    <Card
                      key={itIdx}
                      className={`transition ${it.included ? "" : "opacity-40"} ${
                        !c.food_id ? "border-amber-400" : ""
                      }`}
                    >
                      <CardHeader>
                        <CardTitle className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-600" />
                            {c.name}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-lg tabular-nums text-green-600">
                              {kcal == null ? "?" : `${kcal} kcal`}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItem(itIdx, { included: !it.included })}
                              className="text-xs text-neutral-400 hover:text-neutral-600 underline"
                            >
                              {it.included ? "제외" : "포함"}
                            </button>
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
                            updateCandidate(itIdx, it.selectedIdx, { editedGrams: next });
                          }}
                        />
                        {!c.food_id && (
                          <div className="flex flex-col gap-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                            <label className="text-xs text-amber-800">
                              DB에 없는 음식 · 100g 기준 kcal 입력 (미리보기 전용, 저장되지 않음)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={2000}
                                step={10}
                                value={c.customKcalPer100g ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateCandidate(itIdx, it.selectedIdx, {
                                    customKcalPer100g: v === "" ? undefined : Number(v),
                                  });
                                }}
                                placeholder="예: 150"
                                className="w-24 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-amber-500"
                              />
                              <span className="text-xs text-neutral-500">kcal / 100g</span>
                            </div>
                          </div>
                        )}
                        {it.candidates.length > 1 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">
                              다른 후보 ({it.candidates.length - 1})
                            </summary>
                            <div className="flex flex-col gap-1 mt-1">
                              {it.candidates.map((alt, ai) =>
                                ai === it.selectedIdx ? null : (
                                  <button
                                    key={ai}
                                    type="button"
                                    onClick={() => updateItem(itIdx, { selectedIdx: ai })}
                                    className="text-left px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700"
                                  >
                                    {alt.name}
                                    {alt.kcal_per_100g != null &&
                                      ` · ${Math.round((alt.kcal_per_100g * alt.editedGrams) / 100)} kcal`}
                                  </button>
                                ),
                              )}
                            </div>
                          </details>
                        )}
                        <div className="text-xs text-neutral-400">
                          신뢰도 {(c.confidence * 100).toFixed(0)}%
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </section>
            ));
          })()}
        </section>
      )}

      <Toaster position="top-center" />
    </main>
  );
}
