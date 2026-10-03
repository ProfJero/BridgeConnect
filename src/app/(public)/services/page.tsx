import { Wrench } from "lucide-react";
import type { Metadata } from "next";

import { ServiceCard } from "@/components/cards/listing-cards";
import { CategoryChips } from "@/components/shared/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories, listServices } from "@/features/marketplace/queries";
import { stringParam, uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ searchParams }: PageProps<"/services">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const page = parsePage(sp.page);
  const [categories, communities] = await Promise.all([getCategories("service"), getCommunityOptions()]);
  const category = categories.find((c) => c.slug === stringParam(sp.category, 60));
  const result = await listServices({ q, communityId, categoryId: category?.id, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Services" description="Trusted services from verified local providers." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/services" defaultValue={q} placeholder="Search services" hidden={{ community: communityId, category: category?.slug }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <CategoryChips basePath="/services" categories={categories} active={category?.slug} preserve={{ q, community: communityId }} />
      {result.items.length === 0 ? (
        <EmptyState icon={Wrench} title="No services found" description="Try another search or category." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((s) => <ServiceCard key={s.id} service={s} />)}
        </div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/services" searchParams={{ q, community: communityId, category: category?.slug }} />
    </div>
  );
}
