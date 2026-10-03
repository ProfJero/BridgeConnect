import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { EntityType, Sector } from "./constants";

export const ENTITY_CARD_FIELDS =
  "id, name, slug, tagline, entity_type, sector, logo_path, community_id, communities(name)" as const;

export type EntityFilters = {
  types?: EntityType[];
  sector?: Sector;
  communityId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

/** Public directory listing. RLS returns only active (verified) entities. */
export async function listEntities(filters: EntityFilters) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase
    .from("entities")
    .select(ENTITY_CARD_FIELDS, { count: "exact" })
    .eq("status", "active");
  if (filters.types?.length) query = query.in("entity_type", filters.types);
  if (filters.sector) query = query.eq("sector", filters.sector);
  if (filters.communityId) query = query.eq("community_id", filters.communityId);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("name").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type EntityCardData = Awaited<ReturnType<typeof listEntities>>["items"][number];

export async function getEntityBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entities")
    .select(
      "*, communities(name, slug, districts(name, regions(name))), business_profiles(*), organisation_profiles(*)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Public listings published by an entity (each query is RLS-filtered). */
export async function getEntityListings(entityId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [products, services, jobs, events, posts] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price, currency, unit, status, product_media(position, media_assets(storage_path, alt_text))")
      .eq("entity_id", entityId)
      .in("status", ["active", "out_of_stock"])
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("services")
      .select("id, name, slug, description, price_from, currency, price_note")
      .eq("entity_id", entityId)
      .eq("status", "active")
      .limit(12),
    supabase
      .from("jobs")
      .select("id, title, slug, employment_type, application_deadline, status")
      .eq("entity_id", entityId)
      .eq("status", "open")
      .limit(12),
    supabase
      .from("events")
      .select("id, title, slug, starts_at, venue, is_online, status")
      .eq("entity_id", entityId)
      .eq("status", "published")
      .gte("starts_at", now)
      .order("starts_at")
      .limit(12),
    supabase
      .from("posts")
      .select("id, title, body, kind, created_at, comment_count, reaction_count")
      .eq("entity_id", entityId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  return {
    products: products.data ?? [],
    services: services.data ?? [],
    jobs: jobs.data ?? [],
    events: events.data ?? [],
    posts: posts.data ?? [],
  };
}
