import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Education" };

export default async function Page({ searchParams }: PageProps<"/education">) {
  const sp = await searchParams;
  return <SectorHub hub="education" communityId={uuidParam(sp.community)} />;
}
