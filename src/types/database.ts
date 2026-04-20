export type Profile = {
  id: string;
  created_at: string;
  privacy_accepted_at: string | null;
};

export type Food = {
  food_id: string;
  official_name: string;
  kcal_per_100g: number;
  carb_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  source: "mfds" | "rda" | "manual";
};

export type FoodAlias = { alias: string; food_id: string };

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Meal = {
  id: string;
  user_id: string;
  eaten_at: string;
  meal_type: MealType | null;
  photo_path: string | null;
  total_kcal: number;
  share_count: number;
  note: string | null;
};

export type MealItem = {
  id: string;
  meal_id: string;
  food_id: string;
  grams: number;
  kcal: number;
};
