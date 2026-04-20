import { describe, it, expect, beforeEach, vi } from "vitest";
import { addMeal, todayTotalKcal, listMeals, STORAGE_KEY } from "./storage";

const mem = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
vi.stubGlobal("localStorage", localStorageMock);

describe("storage", () => {
  beforeEach(() => {
    mem.clear();
  });

  it("addMeal persists to localStorage", () => {
    addMeal({
      foods: [{ name: "김치찌개", grams: 300, kcal: 186 }],
      totalKcal: 186,
    });
    expect(listMeals()).toHaveLength(1);
    expect(mem.get(STORAGE_KEY)).toContain("김치찌개");
  });

  it("todayTotalKcal sums entries for the current local day only", () => {
    const today = new Date("2026-04-20T12:00:00+09:00");
    vi.setSystemTime(today);
    addMeal({ foods: [], totalKcal: 200 });
    addMeal({ foods: [], totalKcal: 150 });

    const yesterday = new Date("2026-04-19T12:00:00+09:00");
    const meals = JSON.parse(mem.get(STORAGE_KEY)!);
    meals.push({
      id: "old",
      eatenAt: yesterday.toISOString(),
      foods: [],
      totalKcal: 999,
    });
    mem.set(STORAGE_KEY, JSON.stringify(meals));

    expect(todayTotalKcal(today)).toBe(350);
    vi.useRealTimers();
  });

  it("falls back to empty array on corrupt JSON", () => {
    mem.set(STORAGE_KEY, "{not json");
    expect(listMeals()).toEqual([]);
  });
});
