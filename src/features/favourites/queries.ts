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
