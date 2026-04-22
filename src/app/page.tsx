"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Pencil, Trash2, Check, X, Plus, Search } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { resizeImage } from "@/lib/image-resize";
import { foodEmoji, EMOJI_PALETTE } from "@/lib/food-emoji";
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
  items: { id: string; name: string; grams: number; kcal: number; emoji: string | null }[];
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
  const [goalKcal, setGoalKcal] = useState<number>(2000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [todayMeals, setTodayMeals] = useState<TodayMeal[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingNameKey, setEditingNameKey] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editModeMealId, setEditModeMealId] = useState<string | null>(null);
  const [itemDrafts, setItemDrafts] = useState<
    Record<string, { name: string; grams: string; kcal: string; emoji: string }>
  >({});
  const [mealTypeDraft, setMealTypeDraft] = useState<MealType | null>(null);
  const [savingMeal, setSavingMeal] = useState(false);
  const [burst, setBurst] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<
    { food_id: string; official_name: string; kcal_per_100g: number }[]
  >([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [manualSelected, setManualSelected] = useState<{
    food_id: string;
    official_name: string;
    kcal_per_100g: number;
  } | null>(null);
  const [manualGrams, setManualGrams] = useState(200);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualCustom, setManualCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customKcal100, setCustomKcal100] = useState("");
  const [customEstimating, setCustomEstimating] = useState(false);
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

  const onDeleteMeal = (m: TodayMeal) => {
    const prevMeals = todayMeals;
    const prevKcal = todayKcal;
    setTodayMeals((list) => list.filter((x) => x.id !== m.id));
    setTodayKcal((k) => Math.max(0, k - m.total_kcal));

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const res = await fetch(`/api/meals/${m.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("삭제 실패");
        void fetchToday();
      }
    }, 5000);

    toast("삭제됨 🗑️", {
      description: "5초 내 되돌릴 수 있어요",
      duration: 5000,
      action: {
        label: "되돌리기",
        onClick: () => {
          cancelled = true;
          clearTimeout(timer);
          setTodayMeals(prevMeals);
          setTodayKcal(prevKcal);
        },
      },
    });
  };

  const enterMealEdit = (m: TodayMeal) => {
    const drafts: typeof itemDrafts = {};
    m.items.forEach((it) => {
      drafts[it.id] = {
        name: it.name,
        grams: String(it.grams),
        kcal: String(it.kcal),
        emoji: it.emoji ?? "",
      };
    });
    setItemDrafts(drafts);
    setMealTypeDraft(m.meal_type ?? "snack");
    setEditModeMealId(m.id);
    setExpandedId(m.id);
  };

  const exitMealEdit = () => {
    setEditModeMealId(null);
    setItemDrafts({});
    setMealTypeDraft(null);
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
          const e = d.emoji.trim();
          if (n && n !== it.name) body.name = n;
          if (Number.isFinite(g) && g > 0 && g !== it.grams) body.grams = g;
          if (Number.isFinite(k) && k >= 0 && k !== it.kcal) body.kcal = k;
          if (e && e !== (it.emoji ?? "")) body.emoji = e;
          return Object.keys(body).length === 0 ? null : { id: it.id, body };
        })
        .filter((x): x is { id: string; body: Record<string, string | number> } => x !== null);

      const mealTypeChanged = mealTypeDraft && mealTypeDraft !== m.meal_type;
      if (patches.length === 0 && !mealTypeChanged) {
        exitMealEdit();
        return;
      }
      const requests: Promise<Response>[] = patches.map((p) =>
        fetch(`/api/meal-items/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.body),
        }),
      );
      if (mealTypeChanged) {
        requests.push(
          fetch(`/api/meals/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ meal_type: mealTypeDraft }),
          }),
        );
      }
      const results = await Promise.all(requests);
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

  useEffect(() => {
    const saved = Number(localStorage.getItem("goal_kcal"));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isFinite(saved) && saved > 0) setGoalKcal(saved);
  }, []);

  const saveGoal = () => {
    const n = Math.round(Number(goalDraft));
    setEditingGoal(false);
    if (!Number.isFinite(n) || n < 500 || n > 6000) return;
    setGoalKcal(n);
    localStorage.setItem("goal_kcal", String(n));
  };

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
      setBurst(true);
      setTimeout(() => setBurst(false), 1200);
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

  const runManualSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setManualResults([]);
      return;
    }
    setManualSearching(true);
    try {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        results: { food_id: string; official_name: string; kcal_per_100g: number }[];
      };
      setManualResults(data.results);
    } finally {
      setManualSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (manualOpen) void runManualSearch(manualQuery);
    }, 200);
    return () => clearTimeout(t);
  }, [manualQuery, manualOpen, runManualSearch]);

  const resetManual = () => {
    setManualQuery("");
    setManualResults([]);
    setManualSelected(null);
    setManualGrams(200);
    setManualCustom(false);
    setCustomName("");
    setCustomKcal100("");
  };

  const estimateCustomKcal = async () => {
    const name = customName.trim();
    if (!name) return;
    setCustomEstimating(true);
    try {
      const res = await fetch("/api/foods/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("추천 실패");
        return;
      }
      const { kcal_per_100g } = (await res.json()) as { kcal_per_100g: number };
      setCustomKcal100(String(kcal_per_100g));
    } finally {
      setCustomEstimating(false);
    }
  };

  const saveManualMeal = async () => {
    setManualSaving(true);
    try {
      const candidate = manualCustom
        ? (() => {
            const name = customName.trim();
            const k = Number(customKcal100);
            if (!name || !Number.isFinite(k) || k < 0) return null;
            return {
              name,
              grams: manualGrams,
              kcalPer100g: k,
              source: "llm" as const,
            };
          })()
        : manualSelected
          ? {
              name: manualSelected.official_name,
              grams: manualGrams,
              kcalPer100g: manualSelected.kcal_per_100g,
              source: "db" as const,
            }
          : null;
      if (!candidate) return;

      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: [candidate],
          mealType,
          shareCount: 1,
        }),
      });
      if (!res.ok) {
        toast.error("저장 실패");
        return;
      }
      toast.success("추가됨");
      setManualOpen(false);
      resetManual();
      setBurst(true);
      setTimeout(() => setBurst(false), 1200);
      void fetchToday();
    } finally {
      setManualSaving(false);
    }
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
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-brand-600">C</span>al
              <span className="text-brand-600">C</span>lick
            </h1>
            <span className="text-[10px] text-ink-500">오늘도 예쁘게, 건강하게 🌿</span>
          </div>
        </div>
      </header>

      <section className="relative flex flex-col items-center py-6 rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white shadow-[0_16px_40px_-12px_rgba(255,138,149,0.5)] overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <span className="relative text-xs text-white/80">오늘 섭취 · {todayLabel}</span>
        {(() => {
          const ratio = Math.min(1, todayKcal / Math.max(1, goalKcal));
          const radius = 72;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference * (1 - ratio);
          const over = todayKcal > goalKcal;
          return (
            <div className="relative my-3 w-44 h-44">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold tabular-nums tracking-tight leading-none">
                  {todayKcal}
                </span>
                <span className="text-[10px] text-white/80 mt-1">/ {goalKcal} kcal</span>
                <span className="text-[10px] text-white/90 mt-0.5 font-medium">
                  {over ? "목표 초과 🫣" : `${Math.round(ratio * 100)}%`}
                </span>
              </div>
            </div>
          );
        })()}
        {editingGoal ? (
          <div className="relative flex items-center gap-1">
            <input
              type="number"
              autoFocus
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              onBlur={saveGoal}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                else if (e.key === "Escape") setEditingGoal(false);
              }}
              className="w-20 text-center bg-white/20 rounded-full text-xs py-1 outline-none placeholder:text-white/60"
              placeholder="목표"
            />
            <span className="text-[10px] text-white/80">kcal</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setGoalDraft(String(goalKcal));
              setEditingGoal(true);
            }}
            className="relative text-[10px] text-white/80 hover:text-white underline underline-offset-2"
          >
            목표 kcal 수정
          </button>
        )}
      </section>

      {todayMeals.length === 0 && !items && !loading && (
        <section className="flex flex-col items-center gap-2 py-6 px-6 rounded-3xl bg-white ring-1 ring-brand-100/60 shadow-[0_4px_16px_-8px_rgba(255,138,149,0.15)]">
          <div className="text-5xl" aria-hidden>🍽️</div>
          <p className="text-sm font-semibold text-ink-900">오늘 첫 끼를 찍어볼까요?</p>
          <p className="text-xs text-ink-500 text-center">
            사진 한 장이면 돼요. 귀엽게 기록하고 오늘을 채워봐요 💕
          </p>
        </section>
      )}

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
                    <span className="text-lg tabular-nums text-brand-600">
                      {m.total_kcal} kcal
                    </span>
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
                        onDeleteMeal(m);
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
                    {m.items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-cream-100 text-sm shrink-0 rotate-[-4deg] shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
                            {it.emoji ?? foodEmoji(it.name)}
                          </span>
                          <span>
                            {it.name}{" "}
                            <span className="text-neutral-400 text-xs">{it.grams}g</span>
                          </span>
                        </span>
                        <span className="tabular-nums text-neutral-500">{it.kcal} kcal</span>
                      </div>
                    ))}
                  </div>
                )}
                {isEditMode && (
                  <div className="border-t bg-brand-50/50 px-4 py-3 flex flex-col gap-3">
                    {m.share_count > 1 && (
                      <div className="text-xs text-neutral-500">{m.share_count}인 공유</div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-neutral-500 font-medium px-1">끼니</span>
                      <div className="flex gap-1.5">
                        {(["breakfast", "lunch", "dinner", "snack"] as const).map((t) => {
                          const selected = (mealTypeDraft ?? m.meal_type) === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setMealTypeDraft(t)}
                              className={`flex-1 text-xs py-1.5 rounded-full transition active:scale-95 ${
                                selected
                                  ? "bg-brand-500 text-white shadow-md"
                                  : "bg-white text-ink-700 ring-1 ring-neutral-200 hover:ring-brand-300"
                              }`}
                            >
                              {MEAL_LABELS[t]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
                        emoji: it.emoji ?? "",
                      };
                      const setDraft = (patch: Partial<typeof draft>) =>
                        setItemDrafts((prev) => ({ ...prev, [it.id]: { ...draft, ...patch } }));
                      const currentEmoji = draft.emoji || it.emoji || foodEmoji(it.name);
                      return (
                        <div key={it.id} className="flex flex-col gap-2">
                          <div className="grid grid-cols-[1fr_70px_80px] gap-2 items-center">
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
                          <div className="flex flex-wrap items-center gap-1 pl-0.5">
                            <span className="text-[10px] text-neutral-500 mr-1">스티커</span>
                            {EMOJI_PALETTE.map((em) => {
                              const selected = currentEmoji === em;
                              return (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => setDraft({ emoji: em })}
                                  className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition active:scale-90 ${
                                    selected
                                      ? "bg-brand-500 ring-2 ring-brand-500 shadow-md scale-110"
                                      : "bg-white hover:bg-cream-100 ring-1 ring-neutral-200"
                                  }`}
                                >
                                  {em}
                                </button>
                              );
                            })}
                          </div>
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
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="text-xs text-ink-500 hover:text-brand-600 flex items-center justify-center gap-1 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          사진 없이 수동으로 추가
        </button>
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
      {burst && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          {["💖", "✨", "🌸", "💕", "⭐️", "🫧"].map((e, i) => (
            <span
              key={i}
              className="absolute text-3xl animate-[floatUp_1.2s_ease-out_forwards]"
              style={{
                left: `${45 + (i - 2.5) * 10}%`,
                top: "55%",
                animationDelay: `${i * 60}ms`,
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {manualOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => {
            setManualOpen(false);
            resetManual();
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-3 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">음식 직접 추가</h3>
              <button
                type="button"
                onClick={() => {
                  setManualOpen(false);
                  resetManual();
                }}
                className="p-1 text-ink-500 hover:text-ink-900"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex bg-cream-50 rounded-xl p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setManualCustom(false);
                  setManualSelected(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  !manualCustom ? "bg-white text-brand-600 font-bold shadow-sm" : "text-ink-500"
                }`}
              >
                추천 검색
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualCustom(true);
                  setManualSelected(null);
                  if (!customName && manualQuery) setCustomName(manualQuery);
                }}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  manualCustom ? "bg-white text-brand-600 font-bold shadow-sm" : "text-ink-500"
                }`}
              >
                직접 입력
              </button>
            </div>

            {!manualCustom && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="예: 김치찌개, 바나나, 아메리카노"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-[120px]">
                  {manualSearching && manualResults.length === 0 ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-ink-500" />
                    </div>
                  ) : manualResults.length === 0 ? (
                    <div className="text-center text-xs text-ink-500 py-6 flex flex-col gap-2">
                      <span>
                        {manualQuery.trim() ? "검색 결과가 없어요" : "음식을 검색해 보세요"}
                      </span>
                      {manualQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomName(manualQuery.trim());
                            setManualCustom(true);
                          }}
                          className="text-brand-600 font-medium underline"
                        >
                          &quot;{manualQuery.trim()}&quot; 직접 입력하기
                        </button>
                      )}
                    </div>
                  ) : (
                    manualResults.map((r) => {
                      const selected = manualSelected?.food_id === r.food_id;
                      return (
                        <button
                          key={r.food_id}
                          type="button"
                          onClick={() => setManualSelected(r)}
                          className={`text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition ${
                            selected
                              ? "bg-brand-50 ring-1 ring-brand-400"
                              : "hover:bg-cream-50"
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{foodEmoji(r.official_name)}</span>
                            <span className="truncate text-sm">{r.official_name}</span>
                          </span>
                          <span className="text-[11px] text-ink-500 tabular-nums shrink-0">
                            {Math.round(r.kcal_per_100g)} kcal/100g
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {manualCustom && (
              <div className="flex flex-col gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-ink-500 font-medium">음식 이름</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="예: 엄마표 잡채"
                    className="px-3 py-2.5 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm"
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-500 font-medium">100g당 칼로리</span>
                    <button
                      type="button"
                      onClick={estimateCustomKcal}
                      disabled={!customName.trim() || customEstimating}
                      className="text-[11px] text-brand-600 font-medium disabled:opacity-40 flex items-center gap-1"
                    >
                      {customEstimating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "✨"
                      )}
                      AI 추천받기
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={customKcal100}
                      onChange={(e) => setCustomKcal100(e.target.value)}
                      placeholder="예: 150"
                      className="w-full px-3 py-2.5 pr-14 rounded-xl bg-cream-50 ring-1 ring-brand-100 focus:ring-brand-400 focus:outline-none text-sm tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                      kcal
                    </span>
                  </div>
                </label>
              </div>
            )}

            {(manualSelected || (manualCustom && customName.trim() && customKcal100)) && (
              <div className="flex flex-col gap-2 pt-2 border-t border-brand-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm">중량</span>
                  <span className="text-sm font-bold tabular-nums text-brand-600">
                    {manualGrams}g ·{" "}
                    {Math.round(
                      ((manualCustom
                        ? Number(customKcal100) || 0
                        : manualSelected?.kcal_per_100g ?? 0) *
                        manualGrams) /
                        100,
                    )}{" "}
                    kcal
                  </span>
                </div>
                <Slider
                  value={[manualGrams]}
                  min={50}
                  max={800}
                  step={10}
                  onValueChange={(v) => setManualGrams(Array.isArray(v) ? v[0] : v)}
                />
                <Button onClick={saveManualMeal} disabled={manualSaving} className="mt-1">
                  {manualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "추가"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
