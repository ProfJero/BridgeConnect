import { Package } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUSES } from "@/features/orders/schemas";
import { listEntityOrders } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export default async function WorkspaceOrdersPage({ params, searchParams }: PageProps<"/workspace/[entityId]/orders">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "orders");
  const status = enumParam((await searchParams).status, ORDER_STATUSES);
  const orders = await listEntityOrders(entityId, status);
  const base = `/workspace/${entityId}/orders`;
  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Confirm, prepare and complete orders from residents." />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link key={s ?? "all"} href={s ? `${base}?status=${s}` : base} aria-current={status === s ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm font-medium", status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
            {s ? humanize(s) : "All"}
          </Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Buyer</TableHead><TableHead>Total</TableHead><TableHead>Placed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell><Link href={`${base}/${o.id}`} className="font-semibold text-primary hover:underline">#{o.order_number}</Link><span className="block text-xs text-muted-foreground">{humanize(o.fulfilment)}</span></TableCell>
                  <TableCell>{o.profiles?.display_name}</TableCell>
                  <TableCell>{formatMoney(o.subtotal, o.currency)}</TableCell>
                  <TableCell>{formatDateTime(o.created_at)}</TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
