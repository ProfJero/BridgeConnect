import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrderDetail } from "@/features/orders/components/order-detail";
import { getOrder } from "@/features/orders/queries";
import { SELLER_TRANSITIONS } from "@/features/orders/schemas";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceOrderPage({ params }: PageProps<"/workspace/[entityId]/orders/[orderId]">) {
  const { entityId, orderId } = await params;
  if (!isUuid(orderId)) notFound();
  const ctx = await requireWorkspaceCapability(entityId, "orders");
  const order = await getOrder(orderId);
  if (!order || order.entity_id !== entityId) notFound();
  const transitions = ctx.entity.status === "active" ? SELLER_TRANSITIONS[order.status] : [];
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Order" title={`#${order.order_number}`} />
      <OrderDetail order={order} transitions={transitions} perspective="seller" />
    </div>
  );
}
