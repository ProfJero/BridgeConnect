import { z } from "zod";

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Write a message.")
  .max(2000, "Messages can be up to 2,000 characters.");

export const startConversationSchema = z.object({
  entityId: z.uuid(),
  subject: z.string().trim().max(140, "Use 140 characters or fewer.").optional(),
  body: messageBodySchema,
});

export const sendMessageSchema = z.object({
  conversationId: z.uuid(),
  body: messageBodySchema,
});

export const CONVERSATION_STATUSES = ["open", "closed", "blocked"] as const;
