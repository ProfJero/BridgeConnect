import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Health" };

export default async function Page({ searchParams }: PageProps<"/health">) {
  const sp = await searchParams;
  return <SectorHub hub="health" communityId={uuidParam(sp.community)} />;
}
