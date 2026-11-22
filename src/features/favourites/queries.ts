import "server-only";

import { createClient } from "@/lib/supabase/server";

import { FAVOURITE_COLUMN, type FavouriteKind } from "./types";

export async function isFavourite(kind: FavouriteKind, id: string, userId: string | undefined) {
  if (!userId) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("favourites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq(FAVOURITE_COLUMN[kind], id);
  return (count ?? 0) > 0;
}

/** Which of these ids has the viewer saved? One query for a whole grid. */
export async function getSavedIds(kind: FavouriteKind, ids: string[], userId: string | undefined) {
  if (!userId || ids.length === 0) return new Set<string>();
  const supabase = await createClient();
  const column = FAVOURITE_COLUMN[kind];
  const { data } = await supabase.from("favourites").select(column).eq("user_id", userId).in(column, ids);
  return new Set((data ?? []).map((row) => (row as Record<string, string | null>)[column]).filter(Boolean) as string[]);
}

export async function listMyFavourites() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favourites")
    .select(
      "id, created_at, entities(name, slug, entity_type, tagline), products(name, slug, price, currency), services(name, slug), jobs(title, slug, status), events(title, slug, starts_at)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}
