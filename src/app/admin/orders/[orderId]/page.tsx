import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OrderDetail } from "@/features/orders/components/order-detail";
import { getOrder } from "@/features/orders/queries";
import { isUuid, requireAdminPermission } from "@/lib/auth/session";

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  const { orderId } = await params;
  if (!isUuid(orderId)) notFound();
  await requireAdminPermission("orders.read_all");
  const order = await getOrder(orderId);
  if (!order) notFound();
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Order" title={`#${order.order_number}`} description={order.entities?.name} />
      <OrderDetail order={order} transitions={[]} perspective="admin" />
    </div>
  );
}
