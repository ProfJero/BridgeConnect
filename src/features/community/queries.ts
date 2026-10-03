import "server-only";

import { createClient } from "@/lib/supabase/server";

export const POST_FIELDS =
  "id, title, body, kind, status, created_at, edited_at, comment_count, reaction_count, community_id, author_id, entity_id, moderation_reason, profiles!posts_author_id_fkey(display_name, avatar_path, username), entities(name, slug, logo_path), communities(name), post_media(position, media_assets(storage_path, alt_text))" as const;

export async function listFeed(filters: { communityId?: string; page?: number; pageSize?: number; authorId?: string }) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 15;
  const page = filters.page ?? 1;
  let query = supabase.from("posts").select(POST_FIELDS, { count: "exact" });
  if (filters.authorId) {
    query = query.eq("author_id", filters.authorId);
  } else {
    query = query.eq("status", "published");
  }
  if (filters.communityId) query = query.eq("community_id", filters.communityId);
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export type PostData = Awaited<ReturnType<typeof listFeed>>["items"][number];

export async function getPost(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listComments(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, body, status, created_at, author_id, profiles(display_name, avatar_path)")
    .eq("post_id", postId)
    .order("created_at")
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

/** Which of these posts has the viewer reacted to? */
export async function getMyReactions(postIds: string[], userId: string | undefined) {
  if (!userId || postIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_reactions")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return new Set((data ?? []).map((r) => r.post_id));
}
