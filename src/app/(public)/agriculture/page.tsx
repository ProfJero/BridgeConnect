import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Agriculture",
  description:
    "Farmers, cooperatives, agro-input dealers and agricultural services in your area.",
  path: "/agriculture",
});

export default async function Page({ searchParams }: PageProps<"/agriculture">) {
  const sp = await searchParams;
  return <SectorHub hub="agriculture" communityId={uuidParam(sp.community)} />;
}
