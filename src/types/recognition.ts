import { z } from "zod";

export const FoodCandidate = z.object({
  name: z.string().min(1),
  grams: z.number().positive(),
  confidence: z.number().min(0).max(1),
  food_id: z.string().nullable().optional(),
  kcal_per_100g: z.number().nullable().optional(),
});

export const RecognitionResult = z.object({
  candidates: z.array(FoodCandidate).min(1).max(5),
});

export type FoodCandidate = z.infer<typeof FoodCandidate>;
export type RecognitionResult = z.infer<typeof RecognitionResult>;
