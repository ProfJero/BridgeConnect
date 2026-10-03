import { z } from "zod";

export const POST_KINDS = ["general", "question", "recommendation", "lost_and_found", "announcement"] as const;
export const RESIDENT_POST_KINDS = ["general", "question", "recommendation", "lost_and_found"] as const;

export const POST_KIND_LABEL: Record<(typeof POST_KINDS)[number], string> = {
  general: "General",
  question: "Question",
  recommendation: "Recommendation",
  lost_and_found: "Lost & found",
  announcement: "Announcement",
};

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
