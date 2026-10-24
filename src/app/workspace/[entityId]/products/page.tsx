import { PlusCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listEntityProducts } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";

export default async function WorkspaceProductsPage({ params }: PageProps<"/workspace/[entityId]/products">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "products");
  const products = await listEntityProducts(entityId);
  const base = `/workspace/${entityId}/products`;
  return (
    <div className="space-y-5">
      <PageHeader title="Products" description="Items you sell on the BridgeConnect marketplace." actions={<Button asChild><Link href={`${base}/new`}><PlusCircle aria-hidden /> Add product</Link></Button>} />
      {products.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No products yet" description="Add your first product to start receiving orders." action={<Button asChild><Link href={`${base}/new`}>Add product</Link></Button>} />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.status === "removed" ? <span className="font-medium">{p.name}</span> : <Link className="font-medium text-primary hover:underline" href={`${base}/${p.id}`}>{p.name}</Link>}
                    <span className="block text-xs text-muted-foreground">{p.listing_categories?.name ?? "Uncategorised"}</span>
                    {p.moderation_reason ? <span className="block text-xs text-destructive">Removed: {p.moderation_reason}</span> : null}
                  </TableCell>
                  <TableCell>{formatMoney(p.price, p.currency)}</TableCell>
                  <TableCell>{p.stock_quantity ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
