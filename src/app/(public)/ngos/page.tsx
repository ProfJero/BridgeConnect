import type { Metadata } from "next";

import { parsePage } from "@/components/shared/pagination";
import { DirectoryListing } from "@/features/directory/components/directory-listing";
import { stringParam, uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "NGOs & community organisations" };

export default async function Page({ searchParams }: PageProps<"/ngos">) {
  const sp = await searchParams;
  return (
    <DirectoryListing
      basePath="/ngos"
      title="NGOs & community organisations"
      description="Non-governmental organisations, community groups and cooperatives working locally."
      types={["ngo", "community_group", "cooperative", "faith_organisation"]}
      q={stringParam(sp.q)}
      communityId={uuidParam(sp.community)}
      page={parsePage(sp.page)}
    />
  );
}
