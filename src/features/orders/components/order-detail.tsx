import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMoney, humanize } from "@/lib/format";

import type { getOrder } from "../queries";
import { OrderStatusActions } from "./order-status-actions";
import type { OrderStatus } from "../schemas";

type Order = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

export function OrderDetail({ order, transitions, perspective }: { order: Order; transitions: OrderStatus[]; perspective: "buyer" | "seller" | "admin" }) {
  const history = [...(order.order_status_history ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.order_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.unit_price, order.currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(item.line_total, order.currency)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                  <TableCell className="text-right font-bold">{formatMoney(order.subtotal, order.currency)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 border-l pl-4">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span aria-hidden className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.status} />
                    <time className="text-xs text-muted-foreground" dateTime={h.created_at}>{formatDateTime(h.created_at)}</time>
                  </div>
                  {h.note ? <p className="mt-1 text-sm text-muted-foreground">{h.note}</p> : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> <StatusBadge status={order.status} /></p>
            <p><span className="text-muted-foreground">Placed:</span> {formatDateTime(order.created_at)}</p>
            <p><span className="text-muted-foreground">Fulfilment:</span> {humanize(order.fulfilment)}</p>
            {order.delivery_address ? <p><span className="text-muted-foreground">Deliver to:</span> {order.delivery_address}</p> : null}
            {perspective !== "buyer" ? (
              <>
                <p><span className="text-muted-foreground">Buyer:</span> {order.profiles?.display_name}</p>
                <p><span className="text-muted-foreground">Buyer phone:</span> <a className="text-primary underline" href={`tel:${order.contact_phone.replace(/\s/g, "")}`}>{order.contact_phone}</a></p>
              </>
            ) : (
              <p>
                <span className="text-muted-foreground">Seller:</span>{" "}
                <Link className="text-primary underline" href={`/directory/${order.entities?.slug}`}>{order.entities?.name}</Link>
                {order.entities?.phone ? ` · ${order.entities.phone}` : null}
              </p>
            )}
            {order.buyer_note ? <p><span className="text-muted-foreground">Note:</span> {order.buyer_note}</p> : null}
            {order.status_reason ? <p><span className="text-muted-foreground">Reason:</span> {order.status_reason}</p> : null}
          </CardContent>
        </Card>
        {perspective !== "admin" ? <OrderStatusActions orderId={order.id} transitions={transitions} /> : null}
      </div>
    </div>
  );
}
