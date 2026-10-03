import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminOrders } from "@/features/admin/queries";
import { ORDER_STATUSES } from "@/features/orders/schemas";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminPermission("orders.read_all");
  const sp = await searchParams;
  const status = enumParam(sp.status, ORDER_STATUSES);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listAdminOrders({ status, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Orders" description="Read-only view of marketplace orders in your scope, for dispute support." />
      <div className="flex flex-wrap gap-2">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link key={s ?? "all"} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} className={cn("rounded-full border px-3 py-1 text-sm font-medium", status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{s ? humanize(s) : "All"}</Link>
        ))}
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Seller</TableHead><TableHead>Buyer</TableHead><TableHead>Total</TableHead><TableHead>Placed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary hover:underline">#{o.order_number}</Link></TableCell>
                <TableCell>{o.entities?.name}</TableCell>
                <TableCell>{o.profiles?.display_name}</TableCell>
                <TableCell>{formatMoney(o.subtotal, o.currency)}</TableCell>
                <TableCell>{formatDateTime(o.created_at)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/orders" searchParams={{ status }} />
    </div>
  );
}
