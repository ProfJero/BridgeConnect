"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { riderProfileSchema, TRIP_STATUSES, tripRequestSchema } from "./schemas";

const num = (v: number | "" | undefined) => (v === "" || v === undefined ? undefined : v);

export async function requestTripAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = tripRequestSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_trip", {
    p_kind: v.kind,
    p_community: v.communityId,
    p_pickup_address: v.pickupAddress,
    p_dropoff_address: v.dropoffAddress,
    p_customer_phone: v.customerPhone,
    p_offered_fare: v.offeredFare,
    p_vehicle_type: v.vehicleType || undefined,
    p_pickup_lat: num(v.pickupLat),
    p_pickup_lng: num(v.pickupLng),
    p_dropoff_lat: num(v.dropoffLat),
    p_dropoff_lng: num(v.dropoffLng),
    p_package_description: v.packageDescription || undefined,
    p_recipient_name: v.recipientName || undefined,
    p_recipient_phone: v.recipientPhone || undefined,
    p_note: v.note || undefined,
    p_payment_method: v.paymentMethod,
    p_preferred_rider: v.preferredRiderId || undefined,
    p_order: v.orderId || undefined,
  });
  if (error) return dbFailure(error, "mobility.request");
  revalidatePath("/rides");
  return success("Request sent to riders near you.", { id: data });
}

export async function updateTripStatusAction(
  tripId: string,
  status: (typeof TRIP_STATUSES)[number],
  opts: { reason?: string; finalFare?: number } = {},
): Promise<ActionResult> {
  if (!z.uuid().safeParse(tripId).success || !z.enum(TRIP_STATUSES).safeParse(status).success) return failure("Invalid request.");
  const extra = z.object({ reason: z.string().trim().max(300).optional(), finalFare: z.number().positive().max(10_000).optional() }).safeParse(opts);
  if (!extra.success) return failure("Invalid details.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_trip_status", {
    p_trip: tripId,
    p_status: status,
    p_reason: extra.data.reason,
    p_final_fare: extra.data.finalFare,
  });
  if (error) return dbFailure(error, "mobility.status");
  revalidatePath(`/rides/${tripId}`);
  revalidatePath("/rider");
  const label: Record<string, string> = {
    arrived: "Customer notified that you've arrived.",
    in_progress: "Trip started.",
    completed: "Trip completed. Well done!",
    cancelled: "Request cancelled.",
    requested: "You released the job to other riders.",
  };
  return success(label[status]);
}

export async function acceptTripAction(tripId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(tripId).success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_trip", { p_trip: tripId });
  if (error) return dbFailure(error, "mobility.accept");
  revalidatePath("/rider");
  return success("Job accepted. Head to the pickup point.");
}

export async function rateTripAction(tripId: string, rating: number, comment?: string): Promise<ActionResult> {
  const parsed = z
    .object({ tripId: z.uuid(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() })
    .safeParse({ tripId, rating, comment });
  if (!parsed.success) return failure("Choose 1 to 5 stars.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("rate_trip", { p_trip: tripId, p_rating: rating, p_comment: comment || undefined });
  if (error) return dbFailure(error, "mobility.rate");
  revalidatePath(`/rides/${tripId}`);
  return success("Thanks for rating your rider.");
}

export async function saveRiderProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = riderProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const row = {
    vehicle_type: v.vehicleType,
    vehicle_description: v.vehicleDescription,
    plate_number: v.plateNumber || null,
    offers_rides: v.offersRides,
    offers_delivery: v.offersDelivery,
    community_id: v.communityId,
    service_area: v.serviceArea || null,
    phone: v.phone,
    whatsapp: v.whatsapp || null,
    bio: v.bio || null,
  };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("rider_profiles").select("user_id").eq("user_id", auth.viewer.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("rider_profiles").update(row).eq("user_id", auth.viewer.id)
    : await supabase.from("rider_profiles").insert({ ...row, user_id: auth.viewer.id });
  if (error) return dbFailure(error, "mobility.profile");
  revalidatePath("/rider");
  return success(existing ? "Rider profile updated." : "Application received. DBI will verify you shortly.");
}

export async function setOnlineAction(online: boolean, lat?: number, lng?: number): Promise<ActionResult> {
  const parsed = z.object({ online: z.boolean(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }).safeParse({ online, lat, lng });
  if (!parsed.success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_rider_online", { p_online: online, p_lat: lat, p_lng: lng });
  if (error) return dbFailure(error, "mobility.online");
  revalidatePath("/rider");
  return success(online ? "You're online. New requests will appear here." : "You're offline.");
}

export async function reviewRiderAction(riderId: string, status: "approved" | "suspended" | "rejected", reason?: string): Promise<ActionResult> {
  const parsed = z.object({ riderId: z.uuid(), status: z.enum(["approved", "suspended", "rejected"]), reason: z.string().trim().max(500).optional() }).safeParse({ riderId, status, reason });
  if (!parsed.success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_rider", { p_rider: riderId, p_status: status, p_reason: reason || undefined });
  if (error) return dbFailure(error, "mobility.review");
  revalidatePath("/admin/riders");
  return success(`Rider ${status}.`);
}
