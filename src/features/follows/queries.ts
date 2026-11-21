import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function isFollowing(entityId: string, userId: string | undefined) {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("entity_follows")
    .select("entity_id")
    .eq("entity_id", entityId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function listFollowing(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_follows")
    .select("created_at, entities(id, name, slug, tagline, entity_type, sector, logo_path, community_id, communities(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).flatMap((row) => (row.entities ? [row.entities] : []));
}

export async function listFollowers(entityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_follows")
    .select("created_at, profiles(display_name, avatar_path)")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
