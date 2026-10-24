import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "At least 2 characters.").max(80, "Use 80 characters or fewer."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "3–30 characters: lowercase letters, numbers and underscores.")
    .or(z.literal(""))
    .optional(),
  bio: z.string().trim().max(500, "Use 500 characters or fewer.").optional(),
  homeCommunityId: z.union([z.uuid(), z.literal("")]).optional(),
  avatarPath: z.string().max(500).nullable().optional(),
});
