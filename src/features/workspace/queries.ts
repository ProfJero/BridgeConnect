import "server-only";

import { createClient } from "@/lib/supabase/server";

/** All workspace reads run as the member; RLS scopes them to the entity. */
export async function getWorkspaceSummary(entityId: string) {
  const supabase = await createClient();
  const count = (table: "products" | "services" | "jobs" | "events" | "orders", status?: string[]) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("entity_id", entityId);
    if (status) q = q.in("status", status as never);
    return q.then((r) => r.count ?? 0);
  };
  const [products, services, openJobs, upcomingEvents, pendingOrders, recentOrders] = await Promise.all([
    count("products", ["active"]),
    count("services", ["active"]),
    count("jobs", ["open"]),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("entity_id", entityId).eq("status", "published").gte("starts_at", new Date().toISOString()).then((r) => r.count ?? 0),
    count("orders", ["pending"]),
    supabase.from("orders").select("id, order_number, status, subtotal, currency, created_at").eq("entity_id", entityId).order("created_at", { ascending: false }).limit(5).then((r) => r.data ?? []),
  ]);
  return { products, services, openJobs, upcomingEvents, pendingOrders, recentOrders };
}

export async function getEntityForEdit(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entities")
    .select("*, business_profiles(*), organisation_profiles(*)")
    .eq("id", entityId)
    .single();
  if (error) throw error;
  return data;
}

export async function listEntityProducts(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, price, currency, stock_quantity, status, moderation_reason, updated_at, listing_categories(name)")
    .eq("entity_id", entityId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEntityProduct(entityId: string, productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_media(position, media_id, media_assets(storage_path))")
    .eq("entity_id", entityId)
    .eq("id", productId)
    .maybeSingle();
  return data;
}

export async function listEntityServices(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, slug, price_from, currency, price_note, status, moderation_reason, updated_at")
    .eq("entity_id", entityId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEntityService(entityId: string, serviceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").eq("entity_id", entityId).eq("id", serviceId).maybeSingle();
  return data;
}

export async function listEntityJobs(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, slug, status, employment_type, application_deadline, moderation_reason, updated_at, job_applications(count)")
    .eq("entity_id", entityId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEntityJob(entityId: string, jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("entity_id", entityId).eq("id", jobId).maybeSingle();
  return data;
}

export async function listJobApplicants(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select("id, status, cover_letter, contact_phone, cv_path, employer_note, created_at, profiles(display_name)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listEntityEvents(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, status, starts_at, going_count, capacity, moderation_reason")
    .eq("entity_id", entityId)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEntityEvent(entityId: string, eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("entity_id", entityId).eq("id", eventId).maybeSingle();
  return data;
}

export async function listEntityOrders(entityId: string, status?: string) {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select("id, order_number, status, subtotal, currency, fulfilment, created_at, profiles!orders_buyer_id_fkey(display_name)")
    .eq("entity_id", entityId);
  if (status) q = q.eq("status", status as never);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listEntityMedia(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, storage_path, alt_text, size_bytes, created_at")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listEntityMembers(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_memberships")
    .select("id, role, created_at, user_id, profiles!entity_memberships_user_id_fkey(display_name, avatar_path)")
    .eq("entity_id", entityId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listEntityAds(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listEntityPosts(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, body, status, kind, created_at, comment_count, reaction_count, moderation_reason")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getEntityAnalytics(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("entity_analytics", { p_entity: entityId });
  if (error) throw error;
  return data as {
    favourites: number;
    products_active: number;
    orders_by_status: Record<string, number>;
    revenue_30d: number;
    job_applications: number;
    event_rsvps: number;
    post_reactions: number;
    ad_clicks: number;
    daily_orders: { day: string; orders: number }[];
  };
}
