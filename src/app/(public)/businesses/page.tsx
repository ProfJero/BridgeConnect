import type { Metadata } from "next";

import { parsePage } from "@/components/shared/pagination";
import { DirectoryListing } from "@/features/directory/components/directory-listing";
import { stringParam, uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Businesses" };

export default async function Page({ searchParams }: PageProps<"/businesses">) {
  const sp = await searchParams;
  return (
    <DirectoryListing
      basePath="/businesses"
      title="Businesses"
      description="Verified local businesses, shops and traders."
      types={["business"]}
      q={stringParam(sp.q)}
      communityId={uuidParam(sp.community)}
      page={parsePage(sp.page)}
    />
  );
}
