import { z } from "zod";

export const FoodCandidate = z.object({
  name: z.string().min(1),
  grams: z.number().positive(),
  confidence: z.number().min(0).max(1),
  kcal_per_100g: z.number().nonnegative().optional(),
  food_id: z.string().nullable().optional(),
  source: z.enum(["db", "llm"]).optional(),
});

export const RecognitionItem = z.object({
  label: z.string().nullable().optional(),
  candidates: z.array(FoodCandidate).min(1).max(3),
});

export const RecognitionResult = z.object({
  items: z.array(RecognitionItem).min(1).max(8),
});

export type FoodCandidate = z.infer<typeof FoodCandidate>;
export type RecognitionItem = z.infer<typeof RecognitionItem>;
export type RecognitionResult = z.infer<typeof RecognitionResult>;
