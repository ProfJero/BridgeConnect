import type { Metadata } from "next";

import { SectorHub } from "@/features/directory/components/sector-hub";
import { uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Education",
  description:
    "Schools, colleges and training centres in your community.",
  path: "/education",
});

export default async function Page({ searchParams }: PageProps<"/education">) {
  const sp = await searchParams;
  return <SectorHub hub="education" communityId={uuidParam(sp.community)} />;
}
