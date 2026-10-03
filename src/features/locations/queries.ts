import "server-only";

import { cache } from "react";

import type { LocationTarget } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type CommunityOption = {
  id: string;
  name: string;
  slug: string;
  districtId: string;
  districtName: string;
  regionId: string;
  regionName: string;
};

/** Active communities with their district and region, for pickers. */
export const getCommunityOptions = cache(async (): Promise<CommunityOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("location_directory")
    .select("*")
    .order("region_name")
    .order("district_name")
    .order("community_name");
  return (data ?? []).flatMap((row) =>
    row.community_id && row.district_id && row.region_id
      ? [
          {
            id: row.community_id,
            name: row.community_name ?? "",
            slug: row.community_slug ?? "",
            districtId: row.district_id,
            districtName: row.district_name ?? "",
            regionId: row.region_id,
            regionName: row.region_name ?? "",
          },
        ]
      : [],
  );
});

/** Resolve a community into a full location target for permission checks. */
export async function resolveCommunity(communityId: string | null | undefined): Promise<LocationTarget> {
  if (!communityId) return {};
  const options = await getCommunityOptions();
  const match = options.find((c) => c.id === communityId);
  return match
    ? { communityId: match.id, districtId: match.districtId, regionId: match.regionId }
    : { communityId };
}

export async function getCommunityName(communityId: string | null | undefined) {
  if (!communityId) return null;
  return (await getCommunityOptions()).find((c) => c.id === communityId) ?? null;
}
