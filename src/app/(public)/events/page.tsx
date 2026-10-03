import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";

import { EventCard } from "@/components/cards/listing-cards";
import { CategoryChips } from "@/components/shared/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { listEvents } from "@/features/events/queries";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { stringParam, uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const page = parsePage(sp.page);
  const [categories, communities] = await Promise.all([getCategories("event"), getCommunityOptions()]);
  const category = categories.find((c) => c.slug === stringParam(sp.category, 60));
  const result = await listEvents({ q, communityId, categoryId: category?.id, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Events" description="What's happening in your community." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/events" defaultValue={q} placeholder="Search events" hidden={{ community: communityId, category: category?.slug }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <CategoryChips basePath="/events" categories={categories} active={category?.slug} preserve={{ q, community: communityId }} />
      {result.items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming events" description="Verified organisations publish events here." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{result.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/events" searchParams={{ q, community: communityId, category: category?.slug }} />
    </div>
  );
}
