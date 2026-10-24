import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SitemapRow = { path: string; lastModified: string };

const LIMIT = 5000;

/**
 * Public listings for the XML sitemap. Each query filters to publicly visible rows explicitly (not only via
 * RLS), so the output is the same whether the request comes from a crawler or a signed-in administrator.
 */
export async function listSitemapRows(): Promise<SitemapRow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [entities, products, services, jobs, events] = await Promise.all([
    supabase.from("entities").select("slug, updated_at").eq("status", "active").limit(LIMIT),
    supabase
      .from("products")
      .select("slug, updated_at, entities!inner(status)")
      .in("status", ["active", "out_of_stock"])
      .eq("entities.status", "active")
      .limit(LIMIT),
    supabase
      .from("services")
      .select("slug, updated_at, entities!inner(status)")
      .eq("status", "active")
      .eq("entities.status", "active")
      .limit(LIMIT),
    supabase
      .from("jobs")
      .select("slug, updated_at, entities!inner(status)")
      .eq("status", "open")
      .eq("entities.status", "active")
      .limit(LIMIT),
    supabase
      .from("events")
      .select("slug, updated_at, entities!inner(status)")
      .eq("status", "published")
      .gte("starts_at", now)
      .eq("entities.status", "active")
      .limit(LIMIT),
  ]);
  const rows = (prefix: string, data: { slug: string; updated_at: string }[] | null) =>
    (data ?? []).map((r) => ({ path: `${prefix}/${r.slug}`, lastModified: r.updated_at }));
  return [
    ...rows("/directory", entities.data),
    ...rows("/marketplace", products.data),
    ...rows("/services", services.data),
    ...rows("/jobs", jobs.data),
    ...rows("/events", events.data),
  ];
}
