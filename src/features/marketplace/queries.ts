import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Domain = Database["public"]["Enums"]["listing_domain"];

export async function getCategories(domain: Domain) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_categories")
    .select("id, name, slug, sector")
    .eq("domain", domain)
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export const PRODUCT_CARD_FIELDS =
  "id, name, slug, price, currency, unit, status, entity_id, entities!inner(name, slug, community_id, communities(name)), product_media(position, media_assets(storage_path, alt_text))" as const;

export async function listProducts(filters: {
  categoryId?: string;
  q?: string;
  communityId?: string;
  entityIds?: string[];
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_FIELDS, { count: "exact" })
    .in("status", ["active", "out_of_stock"]);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.communityId) query = query.eq("entities.community_id", filters.communityId);
  if (filters.entityIds) query = query.in("entity_id", filters.entityIds);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type ProductCardData = Awaited<ReturnType<typeof listProducts>>["items"][number];

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, listing_categories(name, slug), entities!inner(id, name, slug, phone, whatsapp, logo_path, community_id, communities(name), business_profiles(delivery_available, accepts_mobile_money)), product_media(position, media_assets(storage_path, alt_text))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const SERVICE_CARD_FIELDS =
  "id, name, slug, description, price_from, currency, price_note, service_area, entity_id, entities!inner(name, slug, sector, community_id, communities(name))" as const;

export async function listServices(filters: {
  categoryId?: string;
  sector?: Database["public"]["Enums"]["sector"];
  q?: string;
  communityId?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 12;
  const page = filters.page ?? 1;
  let query = supabase.from("services").select(SERVICE_CARD_FIELDS, { count: "exact" }).eq("status", "active");
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.sector) query = query.eq("entities.sector", filters.sector);
  if (filters.communityId) query = query.eq("entities.community_id", filters.communityId);
  if (filters.q) query = query.textSearch("search", filters.q, { type: "websearch", config: "simple" });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.order("name").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type ServiceCardData = Awaited<ReturnType<typeof listServices>>["items"][number];

export async function getServiceBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*, listing_categories(name), entities!inner(id, name, slug, phone, whatsapp, email, logo_path, communities(name))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}
