import { Building2 } from "lucide-react";
import Link from "next/link";

import { EntityCard } from "@/components/cards/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { Button } from "@/components/ui/button";
import { getCommunityOptions } from "@/features/locations/queries";

import type { EntityType, Sector } from "../constants";
import { listEntities } from "../queries";

/** Shared server component for every entity directory page. */
export async function DirectoryListing({
  basePath,
  title,
  description,
  types,
  sector,
  q,
  communityId,
  page,
}: {
  basePath: string;
  title: string;
  description: string;
  types?: EntityType[];
  sector?: Sector;
  q?: string;
  communityId?: string;
  page: number;
}) {
  const [result, communities] = await Promise.all([
    listEntities({ types, sector, q, communityId, page }),
    getCommunityOptions(),
  ]);
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button asChild variant="soft">
            <Link href="/apply">
              <Building2 aria-hidden /> List your organisation
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action={basePath} defaultValue={q} placeholder={`Search ${title.toLowerCase()}`} hidden={{ community: communityId }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {result.total === 1 ? "1 verified listing" : `${result.total} verified listings`}
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={q ? "No matches" : "Nothing listed here yet"}
          description={
            q
              ? "Try a different search or community."
              : "Verified organisations will appear here once approved by Digital Bridge Initiative."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((e) => (
            <EntityCard key={e.id} entity={e} />
          ))}
        </div>
      )}
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        basePath={basePath}
        searchParams={{ q, community: communityId }}
      />
    </div>
  );
}
