import { z } from "zod";

import { phoneSchema } from "@/features/orders/schemas";

export const BOOKING_STATUSES = ["requested", "confirmed", "declined", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const bookingRequestSchema = z.object({
  serviceId: z.uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
    // Server-side the database rejects past dates in Ghana time (GMT); this is the friendly early check.
    .refine((d) => d >= todayIso(), "Choose today or a later date."),
  time: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time."), z.literal("")]).optional(),
  note: z.string().trim().max(1000, "Use 1,000 characters or fewer.").optional(),
  contactPhone: phoneSchema,
});

export const bookingStatusSchema = z.object({
  bookingId: z.uuid(),
  status: z.enum(BOOKING_STATUSES),
  note: z.string().trim().max(1000).optional(),
});

/** Transitions each side may make. Mirrors public.update_booking_status (UX only). */
export function allowedBookingTransitions(side: "customer" | "entity", status: BookingStatus): BookingStatus[] {
  if (side === "entity") {
    if (status === "requested") return ["confirmed", "declined"];
    if (status === "confirmed") return ["completed", "cancelled"];
    return [];
  }
  return status === "requested" || status === "confirmed" ? ["cancelled"] : [];
}
