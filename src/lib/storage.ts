export type MealFood = { name: string; grams: number; kcal: number };
export type MealEntry = {
  id: string;
  eatenAt: string;
  foods: MealFood[];
  totalKcal: number;
};

const KEY = "calclick.meals.v1";

function read(): MealEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MealEntry[]) : [];
  } catch {
    return [];
  }
}

function write(meals: MealEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(meals));
}

export function listMeals(): MealEntry[] {
  return read();
}

export function addMeal(input: Omit<MealEntry, "id" | "eatenAt">): MealEntry {
  const entry: MealEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    eatenAt: new Date().toISOString(),
    ...input,
  };
  const meals = read();
  meals.push(entry);
  write(meals);
  return entry;
}

function sameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function todayTotalKcal(now: Date = new Date()): number {
  return read()
    .filter((m) => sameLocalDay(m.eatenAt, now))
    .reduce((sum, m) => sum + m.totalKcal, 0);
}

export const STORAGE_KEY = KEY;
