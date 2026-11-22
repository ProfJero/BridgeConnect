"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { inquirySchema, rentalSchema } from "./schemas";

const blankToNull = <T,>(v: T | "" | undefined) => (v === "" || v === undefined ? null : v);

export async function saveRentalAction(input: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = rentalSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const row = {
    community_id: v.communityId,
    rental_type: v.rentalType,
    title: v.title,
    description: v.description,
    price: v.price,
    period: v.period,
    advance_months: blankToNull(v.advanceMonths),
    bedrooms: blankToNull(v.bedrooms),
    bathrooms: blankToNull(v.bathrooms),
    furnished: v.furnished ?? false,
    amenities: [...new Set(v.amenities ?? [])],
    location_note: v.locationNote || null,
    latitude: v.location?.lat ?? null,
    longitude: v.location?.lng ?? null,
    contact_phone: v.contactPhone,
    whatsapp: v.whatsapp || null,
    available_from: blankToNull(v.availableFrom),
    status: v.status,
  };
  const supabase = await createClient();
  const { data, error } = v.rentalId
    ? await supabase.from("rental_listings").update(row).eq("id", v.rentalId).eq("owner_id", auth.viewer.id).select("id, slug").single()
    : await supabase.from("rental_listings").insert(row).select("id, slug").single();
  if (error) return dbFailure(error, "rentals.save");

  if (v.mediaIds) {
    // Photos are re-attached in order; RLS only accepts the owner's own uploads.
    await supabase.from("rental_media").delete().eq("rental_id", data.id);
    if (v.mediaIds.length) {
      const { error: mediaError } = await supabase
        .from("rental_media")
        .insert(v.mediaIds.map((media_id, position) => ({ rental_id: data.id, media_id, position })));
      if (mediaError) return dbFailure(mediaError, "rentals.media");
    }
  }
  revalidatePath("/rentals");
  revalidatePath("/rentals/mine");
  return success(v.rentalId ? "Listing updated." : "Your property is listed.", data);
}

export async function deleteRentalAction(rentalId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(rentalId).success) return failure("Invalid listing.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("rental_listings").delete().eq("id", rentalId).eq("owner_id", auth.viewer.id).select("id");
  if (error) return dbFailure(error, "rentals.delete");
  if (!data?.length) return failure("This listing can't be deleted.");
  revalidatePath("/rentals/mine");
  return success("Listing deleted.");
}

export async function sendInquiryAction(input: unknown): Promise<ActionResult> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.from("rental_inquiries").insert({
    rental_id: parsed.data.rentalId,
    message: parsed.data.message,
    contact_phone: parsed.data.contactPhone,
    preferred_date: parsed.data.preferredDate || null,
  });
  if (error) return dbFailure(error, "rentals.inquiry");
  revalidatePath("/rentals/mine");
  return success("Request sent. The landlord will call you.");
}

export async function setInquiryStatusAction(inquiryId: string, status: "new" | "contacted" | "closed"): Promise<ActionResult> {
  if (!z.uuid().safeParse(inquiryId).success || !z.enum(["new", "contacted", "closed"]).safeParse(status).success) {
    return failure("Invalid request.");
  }
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("rental_inquiries").update({ status }).eq("id", inquiryId).select("id");
  if (error) return dbFailure(error, "rentals.inquiryStatus");
  if (!data?.length) return failure("Not found.");
  revalidatePath("/rentals/mine");
  return success("Updated.");
}
