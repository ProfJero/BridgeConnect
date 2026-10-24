import type { Metadata } from "next";

import { parsePage } from "@/components/shared/pagination";
import { DirectoryListing } from "@/features/directory/components/directory-listing";
import { stringParam, uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Government",
  description:
    "Government agencies and public offices serving your district and community.",
  path: "/government",
});

export default async function Page({ searchParams }: PageProps<"/government">) {
  const sp = await searchParams;
  return (
    <DirectoryListing
      basePath="/government"
      title="Government"
      description="District assemblies, public offices and government agencies."
      types={["government_agency"]}
      q={stringParam(sp.q)}
      communityId={uuidParam(sp.community)}
      page={parsePage(sp.page)}
    />
  );
}
