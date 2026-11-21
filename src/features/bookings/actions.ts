"use server";

import { revalidatePath } from "next/cache";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { bookingRequestSchema, bookingStatusSchema } from "./schemas";

export async function requestBookingAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_booking", {
    p_service: parsed.data.serviceId,
    p_date: parsed.data.date,
    p_time: parsed.data.time || undefined,
    p_note: parsed.data.note || undefined,
    p_phone: parsed.data.contactPhone,
  });
  if (error) {
    if (error.code === "42501") return failure("This service isn't taking bookings right now.");
    if (error.code === "23505") return failure("You already have a booking for this service on that day.");
    return dbFailure(error, "bookings.request");
  }
  revalidatePath("/bookings");
  return success("Booking requested. You'll be notified when it's confirmed.", { id: data });
}

export async function updateBookingStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = bookingStatusSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_booking_status", {
    p_booking: parsed.data.bookingId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return dbFailure(error, "bookings.status");
  revalidatePath("/bookings");
  revalidatePath("/workspace/[entityId]/bookings", "page");
  return success(`Booking ${parsed.data.status}.`);
}
