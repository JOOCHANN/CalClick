import { z } from "zod";

export const FoodCandidate = z.object({
  name: z.string().min(1),
  grams: z.number().positive(),
  confidence: z.number().min(0).max(1),
});

export const RecognitionResult = z.object({
  candidates: z.array(FoodCandidate).min(1).max(5),
});

export type FoodCandidate = z.infer<typeof FoodCandidate>;
export type RecognitionResult = z.infer<typeof RecognitionResult>;
