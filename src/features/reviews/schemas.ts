import { z } from "zod";

export const reviewSchema = z.object({
  entityId: z.uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5, "Choose a rating."),
  title: z
    .string()
    .trim()
    .max(120, "Use 120 characters or fewer.")
    .refine((v) => v.length === 0 || v.length >= 3, "Titles need at least 3 characters.")
    .optional(),
  body: z
    .string()
    .trim()
    .min(10, "Tell others a little more (at least 10 characters).")
    .max(2000, "Reviews can be up to 2,000 characters."),
});

export const reviewResponseSchema = z.object({
  reviewId: z.uuid(),
  entityId: z.uuid(),
  response: z.string().trim().max(2000, "Replies can be up to 2,000 characters."),
});

export type ReviewInput = z.input<typeof reviewSchema>;
