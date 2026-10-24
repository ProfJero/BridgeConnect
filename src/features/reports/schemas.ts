import { z } from "zod";

export const REPORT_REASONS = [
  "spam",
  "scam_or_fraud",
  "harassment",
  "hate_speech",
  "violence",
  "misinformation",
  "inappropriate",
  "impersonation",
  "prohibited_item",
  "other",
] as const;

export const REPORT_REASON_LABEL: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: "Spam",
  scam_or_fraud: "Scam or fraud",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech",
  violence: "Violence or threats",
  misinformation: "False information",
  inappropriate: "Inappropriate content",
  impersonation: "Impersonation",
  prohibited_item: "Prohibited item",
  other: "Something else",
};

export const REPORT_TARGETS = ["post", "comment", "entity", "product", "service", "job", "event", "profile"] as const;
export type ReportTargetKind = (typeof REPORT_TARGETS)[number];

export const reportSchema = z.object({
  targetKind: z.enum(REPORT_TARGETS),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS, { error: "Choose a reason." }),
  details: z.string().trim().max(2000, "Use 2,000 characters or fewer.").optional(),
});
