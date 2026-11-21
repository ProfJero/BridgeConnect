import { z } from "zod";

export const POST_KINDS = [
  "general",
  "question",
  "recommendation",
  "lost_and_found",
  "help_request",
  "help_offer",
  "poll",
  "announcement",
] as const;
export const RESIDENT_POST_KINDS = [
  "general",
  "question",
  "recommendation",
  "lost_and_found",
  "help_request",
  "help_offer",
  "poll",
] as const;

export type PostKind = (typeof POST_KINDS)[number];

export const POST_KIND_LABEL: Record<PostKind, string> = {
  general: "General",
  question: "Question",
  recommendation: "Recommendation",
  lost_and_found: "Lost & found",
  help_request: "Help needed",
  help_offer: "Offering help",
  poll: "Poll",
  announcement: "Announcement",
};

/** Kinds that can be marked "resolved" by their author (found the item, got the help…). */
export const RESOLVABLE_KINDS: readonly PostKind[] = ["question", "lost_and_found", "help_request"];

export const pollOptionsSchema = z
  .array(z.string().trim().min(1, "Options can't be empty.").max(100, "Keep options under 100 characters."))
  .min(2, "Add at least two options.")
  .max(6, "Polls can have up to 6 options.")
  .refine((opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length, "Options must be different.");

const optionalTitle = z
  .string()
  .trim()
  .max(140, "Use 140 characters or fewer.")
  .refine((v) => v.length === 0 || v.length >= 3, "Titles need at least 3 characters.")
  .optional();

export const createPostSchema = z.object({
  communityId: z.uuid("Choose a community."),
  kind: z.enum(POST_KINDS),
  title: optionalTitle,
  body: z.string().trim().min(1, "Write something to share.").max(5000, "Posts can be up to 5,000 characters."),
  /** Post on behalf of a workspace the user belongs to (verified server-side). */
  entityId: z.union([z.uuid(), z.literal("")]).optional(),
  mediaIds: z.array(z.uuid()).max(4, "Attach up to 4 photos.").optional(),
  /** Only for kind = poll. */
  pollOptions: z.array(z.string()).optional(),
  /** Days the poll stays open (1–30). */
  pollDays: z.coerce.number().int().min(1).max(30).optional(),
}).superRefine((v, ctx) => {
  if (v.kind !== "poll") return;
  const parsed = pollOptionsSchema.safeParse((v.pollOptions ?? []).filter((o) => o.trim().length > 0));
  if (!parsed.success) {
    ctx.addIssue({ code: "custom", path: ["pollOptions"], message: parsed.error.issues[0]?.message ?? "Invalid options." });
  }
});

export const editPostSchema = z.object({
  postId: z.uuid(),
  title: optionalTitle,
  body: z.string().trim().min(1, "Write something to share.").max(5000),
});

export const commentSchema = z.object({
  postId: z.uuid(),
  body: z.string().trim().min(1, "Write a comment.").max(2000, "Comments can be up to 2,000 characters."),
});

export type CreatePostInput = z.input<typeof createPostSchema>;
