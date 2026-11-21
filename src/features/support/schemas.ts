import { z } from "zod";

export const TICKET_CATEGORIES = ["account", "verification", "marketplace", "safety", "bug", "feedback", "other"] as const;
export const TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const TICKET_CATEGORY_LABEL: Record<(typeof TICKET_CATEGORIES)[number], string> = {
  account: "My account",
  verification: "Verification & applications",
  marketplace: "Orders, bookings & marketplace",
  safety: "Safety concern",
  bug: "Something isn't working",
  feedback: "Ideas & feedback",
  other: "Something else",
};

export const ticketSchema = z.object({
  category: z.enum(TICKET_CATEGORIES, { error: "Choose a topic." }),
  subject: z.string().trim().min(3, "Add a short subject.").max(140, "Use 140 characters or fewer."),
  body: z.string().trim().min(10, "Describe the problem (at least 10 characters).").max(4000, "Use 4,000 characters or fewer."),
  entityId: z.union([z.uuid(), z.literal("")]).optional(),
});

export const ticketReplySchema = z.object({
  ticketId: z.uuid(),
  body: z.string().trim().min(1, "Write a reply.").max(4000, "Use 4,000 characters or fewer."),
});

export const ticketUpdateSchema = z.object({
  ticketId: z.uuid(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
});
