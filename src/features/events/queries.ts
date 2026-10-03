import "server-only";

import { createClient } from "@/lib/supabase/server";

export const EVENT_CARD_FIELDS =
  "id, title, slug, starts_at, ends_at, venue, is_online, status, going_count, capacity, cover_path, community_id, communities(name), entities!inner(name, slug, sector)" as const;

export async function listEvents(filters: {
  q?: string;
  communityId?: string;
  categoryId?: string;
  sector?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase
    .from("events")
    .select(EVENT_CARD_FIELDS, { count: "exact" })
    .eq("status", "published")
    .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString());
  if (filters.communityId) query = query.eq("community_id", filters.communityId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.sector) query = query.eq("entities.sector", filters.sector as never);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("starts_at").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type EventCardData = Awaited<ReturnType<typeof listEvents>>["items"][number];

export async function getEventBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, listing_categories(name), communities(name), entities!inner(id, name, slug, logo_path)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyRsvp(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.status ?? null;
}
