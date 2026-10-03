import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchForm } from "@/components/widgets/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModerationButtons } from "@/features/admin/components/moderation-buttons";
import { listAdminProducts } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";
import { stringParam } from "@/lib/search-params";

export default async function AdminMarketplacePage({ searchParams }: PageProps<"/admin/marketplace">) {
  await requireAdminPermission("marketplace.manage");
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listAdminProducts({ q, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Marketplace" description="Products listed by verified sellers in your scope. Remove anything that breaks marketplace rules." />
      <SearchForm action="/admin/marketplace" defaultValue={q} placeholder="Search products" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Seller</TableHead><TableHead>Price</TableHead><TableHead>Listed</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{["active", "out_of_stock"].includes(p.status) ? <Link className="font-medium text-primary hover:underline" href={`/marketplace/${p.slug}`}>{p.name}</Link> : p.name}</TableCell>
                <TableCell>{p.entities?.name}</TableCell>
                <TableCell>{formatMoney(p.price, p.currency)}</TableCell>
                <TableCell>{formatDate(p.created_at)}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell><ModerationButtons targetType="product" targetId={p.id} status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/marketplace" searchParams={{ q }} />
    </div>
  );
}
