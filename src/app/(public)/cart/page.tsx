import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CartView } from "@/features/cart/components/cart-view";
import { getViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Cart", robots: noIndex };

export default async function CartPage() {
  const viewer = await getViewer();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Cart" description="Review your items and place your order." />
      <CartView signedIn={Boolean(viewer)} />
    </div>
  );
}
