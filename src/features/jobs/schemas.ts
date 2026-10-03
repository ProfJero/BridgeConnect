import { z } from "zod";

import { phoneSchema } from "@/features/orders/schemas";

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "volunteer",
  "apprenticeship",
] as const;

export const jobApplicationSchema = z.object({
  jobId: z.uuid(),
  coverLetter: z
    .string()
    .trim()
    .min(20, "Tell the employer a little more (at least 20 characters).")
    .max(5000, "Use 5,000 characters or fewer."),
  contactPhone: phoneSchema,
  /** Storage path of an uploaded CV, validated against the applicant's folder. */
  cvPath: z.string().max(500).optional(),
});
