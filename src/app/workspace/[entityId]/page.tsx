import { Briefcase, CalendarDays, Package, PlusCircle, ShoppingBag, Wrench } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { getWorkspaceSummary } from "@/features/workspace/queries";
import { getWorkspace } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/format";

export default async function WorkspaceDashboard({ params }: PageProps<"/workspace/[entityId]">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  const summary = await getWorkspaceSummary(entityId);
  const base = `/workspace/${entityId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={ENTITY_TYPE_LABEL[ctx.entity.entity_type]}
        title={ctx.entity.name}
        description="Manage your verified presence on BridgeConnect."
        actions={
          ctx.can("posts") ? (
            <Button asChild><Link href={`/community/new?as=${entityId}`}><PlusCircle aria-hidden /> New post</Link></Button>
          ) : null
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ctx.can("orders") ? <StatCard label="Pending orders" value={summary.pendingOrders} icon={Package} tone={summary.pendingOrders ? "warning" : "primary"} href={`${base}/orders?status=pending`} /> : null}
        {ctx.can("products") ? <StatCard label="Active products" value={summary.products} icon={ShoppingBag} href={`${base}/products`} /> : null}
        {ctx.can("services") ? <StatCard label="Active services" value={summary.services} icon={Wrench} tone="green" href={`${base}/services`} /> : null}
        {ctx.can("jobs") ? <StatCard label="Open jobs" value={summary.openJobs} icon={Briefcase} href={`${base}/jobs`} /> : null}
        {ctx.can("events") ? <StatCard label="Upcoming events" value={summary.upcomingEvents} icon={CalendarDays} tone="green" href={`${base}/events`} /> : null}
      </div>
      {ctx.can("orders") ? (
        <Section title="Recent orders" action={<Link className="text-sm font-medium text-primary hover:underline" href={`${base}/orders`}>All orders</Link>}>
          {summary.recentOrders.length === 0 ? (
            <EmptyState icon={Package} title="No orders yet" description="Orders placed on your products will appear here." />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {summary.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`${base}/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                    <span>
                      <span className="block font-semibold">#{o.order_number}</span>
                      <span className="block text-sm text-muted-foreground">{formatDate(o.created_at)} · {formatMoney(o.subtotal, o.currency)}</span>
                    </span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
      <Section title="Your workspace">
        <p className="text-sm text-muted-foreground">
          Modules available to {ENTITY_TYPE_LABEL[ctx.entity.entity_type].toLowerCase()}s: {ctx.capabilities.join(", ").replace(/_/g, " ")}.
          Need something else? Contact Digital Bridge Initiative.
        </p>
      </Section>
    </div>
  );
}
