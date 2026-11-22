import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { RentalType } from "./schemas";

export const RENTAL_CARD_FIELDS =
  "id, slug, title, rental_type, price, currency, period, bedrooms, bathrooms, furnished, location_note, status, created_at, communities(name), rental_media(position, media_assets(storage_path, alt_text))" as const;

export async function listRentals(filters: {
  q?: string;
  communityId?: string;
  type?: RentalType;
  maxPrice?: number;
  minBedrooms?: number;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase.from("rental_listings").select(RENTAL_CARD_FIELDS, { count: "exact" }).eq("status", "available");
  if (filters.communityId) query = query.eq("community_id", filters.communityId);
  if (filters.type) query = query.eq("rental_type", filters.type);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  if (filters.minBedrooms) query = query.gte("bedrooms", filters.minBedrooms);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type RentalCardData = Awaited<ReturnType<typeof listRentals>>["items"][number];

export const getRentalBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_listings")
    .select("*, communities(name, districts(name, regions(name))), rental_media(position, media_assets(id, storage_path, alt_text)), profiles!rental_listings_owner_id_fkey(display_name, avatar_path)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export async function listMyRentals(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_listings")
    .select(`${RENTAL_CARD_FIELDS}, moderation_reason, rental_inquiries(id, message, contact_phone, preferred_date, status, created_at, profiles!rental_inquiries_sender_id_fkey(display_name))`)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMyInquiries(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rental_inquiries")
    .select("id, message, status, created_at, rental_listings(title, slug, status)")
    .eq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
