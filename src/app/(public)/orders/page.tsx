import { Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listMyOrders } from "@/features/orders/queries";
import { requireViewer } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const viewer = await requireViewer("/orders");
  const orders = await listMyOrders(viewer.id);
  return (
    <div className="space-y-5">
      <PageHeader title="My orders" description="Track orders you've placed with local sellers." />
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="Browse the marketplace to find products from verified local sellers." action={<Button asChild><Link href="/marketplace">Go to marketplace</Link></Button>} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                <div className="min-w-0">
                  <p className="font-semibold">#{o.order_number} · {o.entities?.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(o.created_at)} · {formatMoney(o.subtotal, o.currency)}</p>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
