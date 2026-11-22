import { House, PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CategoryChips } from "@/components/shared/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { Button } from "@/components/ui/button";
import { getCommunityOptions } from "@/features/locations/queries";
import { RentalCard } from "@/features/rentals/components/rental-card";
import { listRentals } from "@/features/rentals/queries";
import { RENTAL_TYPE_LABEL, RENTAL_TYPES } from "@/features/rentals/schemas";
import { enumParam, stringParam, uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Houses, rooms & shops for rent",
  description: "Find rooms, self-contains, apartments, houses, shops, offices and land for rent in your community. Contact landlords directly.",
  path: "/rentals",
  image: "/og/rentals.png",
});

const PRICE_CHIPS = [
  { slug: "300", name: "Under GH₵300" },
  { slug: "600", name: "Under GH₵600" },
  { slug: "1000", name: "Under GH₵1,000" },
  { slug: "2000", name: "Under GH₵2,000" },
];

export default async function RentalsPage({ searchParams }: PageProps<"/rentals">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const type = enumParam(sp.type, RENTAL_TYPES);
  const maxPrice = enumParam(sp.max, ["300", "600", "1000", "2000"] as const);
  const page = parsePage(sp.page);
  const [result, communities] = await Promise.all([
    listRentals({ q, communityId, type, maxPrice: maxPrice ? Number(maxPrice) : undefined, page }),
    getCommunityOptions(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Rentals"
        description="Rooms, houses, shops and land near you."
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-full"><Link href="/rentals/mine">My listings</Link></Button>
            <Button asChild size="sm" className="rounded-full"><Link href="/rentals/new"><PlusCircle aria-hidden /> List property</Link></Button>
          </>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/rentals" defaultValue={q} placeholder="Search rentals, e.g. self-contain Kwamankese" hidden={{ community: communityId, type, max: maxPrice }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <CategoryChips basePath="/rentals" param="type" label="Property type" categories={RENTAL_TYPES.map((t) => ({ slug: t, name: RENTAL_TYPE_LABEL[t] }))} active={type} preserve={{ q, community: communityId, max: maxPrice }} />
      <CategoryChips basePath="/rentals" param="max" label="Budget" allLabel="Any price" categories={PRICE_CHIPS} active={maxPrice} preserve={{ q, community: communityId, type }} />
      {result.items.length === 0 ? (
        <EmptyState
          icon={House}
          title="No rentals found"
          description={q || type || maxPrice ? "Try a different filter." : "Be the first to list a property in your community."}
          action={<Button asChild><Link href="/rentals/new">List a property</Link></Button>}
        />
      ) : (
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((r) => <RentalCard key={r.id} rental={r} />)}
        </div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/rentals" searchParams={{ q, community: communityId, type, max: maxPrice }} />
    </div>
  );
}
