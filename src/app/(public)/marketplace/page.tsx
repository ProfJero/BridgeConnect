import { LayoutGrid, Package, ShoppingBag } from "lucide-react";
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
import { CartButton } from "@/features/cart/components/cart-button";
import { getSavedIds } from "@/features/favourites/queries";
import { getViewer } from "@/lib/auth/session";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories, listProducts } from "@/features/marketplace/queries";
import { stringParam, uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Marketplace",
  description:
    "Buy fresh produce, crafts and everyday goods from verified local sellers. Order for pickup or delivery and pay with mobile money.",
  path: "/marketplace",
  image: "/og/marketplace.png",
});

export default async function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const categorySlug = stringParam(sp.category, 60);
  const page = parsePage(sp.page);
  const [categories, communities] = await Promise.all([getCategories("product"), getCommunityOptions()]);
  const category = categories.find((c) => c.slug === categorySlug);
  const [result, viewer] = await Promise.all([
    listProducts({ q, communityId, categoryId: category?.id, page }),
    getViewer(),
  ]);
  const saved = await getSavedIds("product", result.items.map((p) => p.id), viewer?.id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marketplace"
        description="Buy from verified local sellers — pickup or delivery."
        actions={
          <>
            <Button asChild variant="ghost" size="icon" aria-label="All categories">
              <Link href="/marketplace/categories"><LayoutGrid aria-hidden className="size-5" /></Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="My orders">
              <Link href="/orders"><Package aria-hidden className="size-5" /></Link>
            </Button>
            <CartButton />
          </>
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
        <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {result.items.map((p) => <ProductCard key={p.id} product={p} saved={saved.has(p.id)} signedIn={Boolean(viewer)} />)}
        </div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/marketplace" searchParams={{ q, community: communityId, category: category?.slug }} />
    </div>
  );
}
