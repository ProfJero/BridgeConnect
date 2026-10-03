import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/cards/product-card";
import { CategoryChips } from "@/components/shared/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories, listProducts } from "@/features/marketplace/queries";
import { stringParam, uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const categorySlug = stringParam(sp.category, 60);
  const page = parsePage(sp.page);
  const [categories, communities] = await Promise.all([getCategories("product"), getCommunityOptions()]);
  const category = categories.find((c) => c.slug === categorySlug);
  const result = await listProducts({ q, communityId, categoryId: category?.id, page });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marketplace"
        description="Buy directly from verified local sellers. Pay on pickup or delivery."
        actions={
          <Button asChild variant="outline">
            <Link href="/orders">My orders</Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/marketplace" defaultValue={q} placeholder="Search products" hidden={{ community: communityId, category: category?.slug }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <CategoryChips basePath="/marketplace" categories={categories} active={category?.slug} preserve={{ q, community: communityId }} />
      <AdSlot placement="marketplace" communityId={communityId} />
      {result.items.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No products found" description={q || category ? "Try another search or category." : "Verified sellers haven't listed products here yet."} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/marketplace" searchParams={{ q, community: communityId, category: category?.slug }} />
    </div>
  );
}
