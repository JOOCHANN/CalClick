"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { resizeImage } from "@/lib/image-resize";
import type { FoodCandidate, RecognitionResult } from "@/types/recognition";

type EditableCandidate = FoodCandidate & { editedGrams: number };
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

function candKcal(c: EditableCandidate): number {
  const k = c.kcal_per_100g ?? 0;
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
  const resizedRef = useRef<Blob | null>(null);
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
  const [editingNameKey, setEditingNameKey] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editModeMealId, setEditModeMealId] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, { name: string; grams: string; kcal: string }>
  >({});
  const [savingMeal, setSavingMeal] = useState(false);
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

  const enterMealEdit = (m: TodayMeal) => {
    const drafts: typeof itemDrafts = {};
    m.items.forEach((it) => {
      drafts[it.id] = { name: it.name, grams: String(it.grams), kcal: String(it.kcal) };
    });
    setItemDrafts(drafts);
    setEditModeMealId(m.id);
    setExpandedId(m.id);
  };

  const exitMealEdit = () => {
    setEditModeMealId(null);
    setItemDrafts({});
  };

  const saveMealEdits = async (m: TodayMeal) => {
    setSavingMeal(true);
    try {
      const patches = m.items
        .map((it) => {
          const d = itemDrafts[it.id];
          if (!d) return null;
          const body: Record<string, string | number> = {};
          const n = d.name.trim();
          const g = Number(d.grams);
          const k = Math.round(Number(d.kcal));
          if (n && n !== it.name) body.name = n;
          if (Number.isFinite(g) && g > 0 && g !== it.grams) body.grams = g;
          if (Number.isFinite(k) && k >= 0 && k !== it.kcal) body.kcal = k;
          return Object.keys(body).length === 0 ? null : { id: it.id, body };
        })
        .filter((x): x is { id: string; body: Record<string, string | number> } => x !== null);

      if (patches.length === 0) {
        exitMealEdit();
        return;
      }
      const results = await Promise.all(
        patches.map((p) =>
          fetch(`/api/meal-items/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p.body),
          }),
        ),
      );
      if (results.some((r) => !r.ok)) {
        toast.error("일부 항목 수정 실패");
      } else {
        toast.success("수정됨");
      }
      exitMealEdit();
      fetchToday();
    } finally {
      setSavingMeal(false);
    }
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
    setSaving(true);
    try {
      let photoPath: string | undefined;
      if (resizedRef.current) {
        const fd = new FormData();
        fd.append("image", resizedRef.current, "meal.jpg");
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (up.ok) {
          const d = await up.json();
          photoPath = d.path;
        } else {
          const d = await up.json().catch(() => ({}));
          toast.error(`사진 업로드 실패: ${d.error ?? up.status}`);
        }
      }
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: selected.map((c) => ({
            name: c.name,
            grams: c.editedGrams,
            kcalPer100g: c.kcal_per_100g ?? 0,
            source: c.source ?? (c.food_id ? "db" : "llm"),
          })),
          shareCount,
          mealType,
          photoPath,
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
      resizedRef.current = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      const prefix = `${MEAL_LABELS[mealType]} +${data.total_kcal} kcal 저장됨`;
      const base = shareCount > 1 ? `${prefix} (${shareCount}명 공유)` : prefix;
      toast.success(base);
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
      resizedRef.current = blob;
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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="CalClick" className="w-9 h-9 rounded-2xl shadow-[0_6px_16px_-4px_rgba(255,138,149,0.4)]" />
          <div className="flex flex-col leading-tight">
            <h1 className="text-lg font-bold tracking-tight">CalClick</h1>
            <span className="text-[10px] text-ink-500">오늘도 예쁘게, 건강하게 🌿</span>
          </div>
        </div>
        <div className="flex gap-1 text-xs">
          <Link href="/me" className="px-3 py-1.5 rounded-full bg-white shadow-sm hover:shadow text-ink-700 active:scale-95 transition">통계</Link>
          <Link href="/settings" className="px-3 py-1.5 rounded-full bg-white shadow-sm hover:shadow text-ink-700 active:scale-95 transition">설정</Link>
        </div>
      </header>

      <section className="relative flex flex-col items-center py-6 rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white shadow-[0_16px_40px_-12px_rgba(255,138,149,0.5)] overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <span className="relative text-xs text-white/80">오늘 섭취 · {todayLabel}</span>
        <span className="relative text-6xl font-extrabold tabular-nums tracking-tight mt-1">
          {todayKcal}
        </span>
        <span className="relative text-xs text-white/80 mt-0.5">kcal</span>
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
            const isEditMode = editModeMealId === m.id;
            const open = expandedId === m.id || isEditMode;
            const editing = editingId === m.id;
            return (
              <Card key={m.id} className="overflow-hidden py-0 gap-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : m.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-neutral-50"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-700 text-xs px-2 py-0.5 shrink-0">
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
                        className="w-20 text-right text-lg tabular-nums text-brand-600 bg-transparent border-b border-brand-500 outline-none"
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
                        className="text-lg tabular-nums text-brand-600 hover:underline"
                      >
                        {m.total_kcal} kcal
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditMode) exitMealEdit();
                        else enterMealEdit(m);
                      }}
                      aria-label="수정"
                      className={`${isEditMode ? "text-brand-600" : "text-neutral-300 hover:text-brand-600"}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </span>
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
                {open && !isEditMode && (
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
                {isEditMode && (
                  <div className="border-t bg-brand-50/50 px-4 py-3 flex flex-col gap-3">
                    {m.share_count > 1 && (
                      <div className="text-xs text-neutral-500">{m.share_count}인 공유</div>
                    )}
                    <div className="grid grid-cols-[1fr_70px_80px] gap-2 text-[10px] text-neutral-500 font-medium px-1">
                      <span>이름</span>
                      <span className="text-right">그램</span>
                      <span className="text-right">kcal</span>
                    </div>
                    {m.items.map((it) => {
                      const draft = itemDrafts[it.id] ?? {
                        name: it.name,
                        grams: String(it.grams),
                        kcal: String(it.kcal),
                      };
                      const setDraft = (patch: Partial<typeof draft>) =>
                        setItemDrafts((prev) => ({ ...prev, [it.id]: { ...draft, ...patch } }));
                      return (
                        <div
                          key={it.id}
                          className="grid grid-cols-[1fr_70px_80px] gap-2 items-center"
                        >
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) => setDraft({ name: e.target.value })}
                            className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                          />
                          <input
                            type="number"
                            value={draft.grams}
                            onChange={(e) => setDraft({ grams: e.target.value })}
                            className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm tabular-nums text-right outline-none focus:border-brand-500"
                          />
                          <input
                            type="number"
                            value={draft.kcal}
                            onChange={(e) => setDraft({ kcal: e.target.value })}
                            className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm tabular-nums text-right outline-none focus:border-brand-500"
                          />
                        </div>
                      );
                    })}
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={exitMealEdit}
                        disabled={savingMeal}
                      >
                        <X className="w-4 h-4" />
                        취소
                      </Button>
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={() => saveMealEdits(m)}
                        disabled={savingMeal}
                      >
                        {savingMeal ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            저장
                          </>
                        )}
                      </Button>
                    </div>
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
                        ? "bg-brand-500 text-white"
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
                        ? "bg-brand-500 text-white"
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
              <span className="text-2xl font-semibold tabular-nums text-brand-600">
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
            const palette = [
              "bg-brand-50 ring-brand-100",
              "bg-amber-50 ring-amber-100",
              "bg-sky-50 ring-sky-100",
              "bg-rose-50 ring-rose-100",
              "bg-violet-50 ring-violet-100",
              "bg-lime-50 ring-lime-100",
            ];
            return [...groups.entries()].map(([label, idxs], gi) => (
              <section
                key={label}
                className={`flex flex-col gap-2 rounded-xl ring-1 px-3 py-3 ${palette[gi % palette.length]}`}
              >
                <h3 className="text-sm font-semibold text-neutral-800 px-1">{label}</h3>
                {idxs.map((itIdx) => {
                  const it = items[itIdx];
                  const c = it.candidates[it.selectedIdx];
                  const kcal = candKcal(c);
                  const isLlm = c.source === "llm";
                  return (
                    <Card
                      key={itIdx}
                      className={`transition ${it.included ? "" : "opacity-40"}`}
                    >
                      <CardHeader>
                        <CardTitle className="flex justify-between items-baseline gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0" />
                            {(() => {
                              const nameKey = `${itIdx}-${it.selectedIdx}`;
                              const isEditing = editingNameKey === nameKey;
                              return isEditing ? (
                                <input
                                  autoFocus
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  onBlur={() => {
                                    const next = nameDraft.trim();
                                    setEditingNameKey(null);
                                    if (next && next !== c.name) {
                                      updateCandidate(itIdx, it.selectedIdx, { name: next });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    else if (e.key === "Escape") setEditingNameKey(null);
                                  }}
                                  className="min-w-0 flex-1 bg-transparent border-b border-brand-500 outline-none"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNameKey(nameKey);
                                    setNameDraft(c.name);
                                  }}
                                  className="truncate text-left hover:underline"
                                  title="이름 수정"
                                >
                                  {c.name}
                                </button>
                              );
                            })()}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                                isLlm
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-mint-100 text-mint-600"
                              }`}
                              title={isLlm ? "AI가 추정한 칼로리" : "식약처 DB에서 가져온 칼로리"}
                            >
                              {isLlm ? "AI 추정" : "DB"}
                            </span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <span className="text-lg tabular-nums text-brand-600">
                              {kcal} kcal
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
                                    className="text-left px-2 py-1 rounded hover:bg-neutral-100 text-neutral-700 flex justify-between items-center"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      {alt.name}
                                      <span
                                        className={`text-[9px] px-1 py-0.5 rounded ${
                                          alt.source === "llm"
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-mint-100 text-mint-600"
                                        }`}
                                      >
                                        {alt.source === "llm" ? "AI" : "DB"}
                                      </span>
                                    </span>
                                    {alt.kcal_per_100g != null && (
                                      <span className="text-neutral-500 tabular-nums">
                                        {Math.round((alt.kcal_per_100g * alt.editedGrams) / 100)} kcal
                                      </span>
                                    )}
                                  </button>
                                ),
                              )}
                            </div>
                          </details>
                        )}
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
