import "server-only";

import { createClient } from "@/lib/supabase/server";

export const SEARCH_KINDS = ["entity", "product", "service", "job", "event", "post"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export async function searchDirectory(query: string, communityId?: string | null, kinds?: SearchKind[]) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_directory", {
    p_query: q,
    p_community: communityId ?? undefined,
    p_kinds: kinds?.length ? kinds : undefined,
    p_limit: 40,
  });
  if (error) throw error;
  return data ?? [];
}

export function searchResultHref(kind: string, slug: string | null, id: string): string {
  switch (kind) {
    case "entity":
      return `/directory/${slug}`;
    case "product":
      return `/marketplace/${slug}`;
    case "service":
      return `/services/${slug}`;
    case "job":
      return `/jobs/${slug}`;
    case "event":
      return `/events/${slug}`;
    default:
      return `/community/posts/${id}`;
  }
}
