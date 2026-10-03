import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Agriculture" };

export default async function Page({ searchParams }: PageProps<"/agriculture">) {
  const sp = await searchParams;
  return <SectorHub hub="agriculture" communityId={uuidParam(sp.community)} />;
}
