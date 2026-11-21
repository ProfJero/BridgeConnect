import "server-only";

import { createClient } from "@/lib/supabase/server";

const REVIEW_FIELDS =
  "id, entity_id, author_id, rating, title, body, status, moderation_reason, response, responded_at, edited_at, created_at, profiles!entity_reviews_author_id_fkey(display_name, avatar_path)" as const;

/** Published reviews of an entity (RLS hides everything else from the public). */
export async function listEntityReviews(entityId: string, opts: { page?: number; pageSize?: number } = {}) {
  const supabase = await createClient();
  const pageSize = opts.pageSize ?? 10;
  const page = opts.page ?? 1;
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("entity_reviews")
    .select(REVIEW_FIELDS, { count: "exact" })
    .eq("entity_id", entityId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type ReviewData = Awaited<ReturnType<typeof listEntityReviews>>["items"][number];

/** Star distribution (5 → 1) for the rating summary. */
export async function getRatingDistribution(entityId: string): Promise<Record<1 | 2 | 3 | 4 | 5, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entity_reviews")
    .select("rating")
    .eq("entity_id", entityId)
    .eq("status", "published")
    .limit(5000);
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of data ?? []) dist[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
  return dist;
}

export async function getMyReview(entityId: string, userId: string | undefined) {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("entity_reviews")
    .select(REVIEW_FIELDS)
    .eq("entity_id", entityId)
    .eq("author_id", userId)
    .maybeSingle();
  return data;
}

/** Workspace view: every review the managers can see, including held/hidden ones. */
export async function listWorkspaceReviews(entityId: string, filter: "all" | "unanswered" = "all") {
  const supabase = await createClient();
  let query = supabase.from("entity_reviews").select(REVIEW_FIELDS).eq("entity_id", entityId);
  if (filter === "unanswered") query = query.is("response", null).eq("status", "published");
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}
