import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrderDetail } from "@/features/orders/components/order-detail";
import { getOrder } from "@/features/orders/queries";
import { BUYER_CANCELLABLE } from "@/features/orders/schemas";
import { isUuid, requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/orders/${id}`);
  const order = await getOrder(id);
  // RLS already hides other people's orders; this page is the buyer's view.
  if (!order || order.buyer_id !== viewer.id) notFound();
  const transitions = viewer.isActive && BUYER_CANCELLABLE.includes(order.status) ? (["cancelled"] as const) : [];
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Order" title={`#${order.order_number}`} description={order.entities?.name} />
      <OrderDetail order={order} transitions={[...transitions]} perspective="buyer" />
    </div>
  );
}
