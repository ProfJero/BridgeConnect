import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Health",
  description:
    "Hospitals, clinics, pharmacies and health facilities near you.",
  path: "/health",
});

export default async function Page({ searchParams }: PageProps<"/health">) {
  const sp = await searchParams;
  return <SectorHub hub="health" communityId={uuidParam(sp.community)} />;
}
