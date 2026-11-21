import "server-only";

import { createClient } from "@/lib/supabase/server";

export const POST_FIELDS =
  "id, title, body, kind, status, created_at, edited_at, resolved_at, poll_closes_at, comment_count, reaction_count, community_id, author_id, entity_id, moderation_reason, profiles!posts_author_id_fkey(display_name, avatar_path, username), entities(name, slug, logo_path), communities(name), post_media(position, media_assets(storage_path, alt_text))" as const;

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

export type PollData = {
  options: { id: string; label: string; position: number; votes: number }[];
  totalVotes: number;
  myOptionId: string | null;
  closesAt: string | null;
  closed: boolean;
};

/** Options, counts and the viewer's vote for every poll among these posts. */
export async function getPolls(
  posts: { id: string; kind: string; poll_closes_at: string | null }[],
  userId: string | undefined,
): Promise<Map<string, PollData>> {
  const pollPosts = posts.filter((p) => p.kind === "poll");
  const result = new Map<string, PollData>();
  if (pollPosts.length === 0) return result;
  const ids = pollPosts.map((p) => p.id);
  const supabase = await createClient();
  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase.from("poll_options").select("id, post_id, label, position, vote_count").in("post_id", ids).order("position"),
    userId
      ? supabase.from("poll_votes").select("post_id, option_id").eq("user_id", userId).in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string; option_id: string }[] }),
  ]);
  const now = Date.now();
  for (const post of pollPosts) {
    const opts = (options ?? []).filter((o) => o.post_id === post.id);
    result.set(post.id, {
      options: opts.map((o) => ({ id: o.id, label: o.label, position: o.position, votes: o.vote_count })),
      totalVotes: opts.reduce((sum, o) => sum + o.vote_count, 0),
      myOptionId: (votes ?? []).find((v) => v.post_id === post.id)?.option_id ?? null,
      closesAt: post.poll_closes_at,
      closed: post.poll_closes_at ? new Date(post.poll_closes_at).getTime() <= now : false,
    });
  }
  return result;
}
