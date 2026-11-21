import {
  BellRing,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Inbox,
  Megaphone,
  Package,
  PlusCircle,
  ShoppingBag,
  Star,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { isUnread } from "@/features/messages/queries";
import { getWorkspaceSummary } from "@/features/workspace/queries";
import type { EntityCapability } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/auth/session";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";

type QuickAction = { href: string; label: string; icon: LucideIcon; capability: EntityCapability };

export default async function WorkspaceDashboard({ params }: PageProps<"/workspace/[entityId]">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  const summary = await getWorkspaceSummary(entityId);
  const base = `/workspace/${entityId}`;
  const unreadThreads = summary.recentConversations.filter((c) =>
    isUnread({ ...c, user_last_read_at: null }, "entity"),
  ).length;

  const quickActions: QuickAction[] = [
    { href: `/community/new?as=${entityId}`, label: "New post", icon: PlusCircle, capability: "posts" },
    { href: `${base}/products/new`, label: "Add product", icon: ShoppingBag, capability: "products" },
    { href: `${base}/services/new`, label: "Add service", icon: Wrench, capability: "services" },
    { href: `${base}/jobs/new`, label: "Post a job", icon: Briefcase, capability: "jobs" },
    { href: `${base}/events/new`, label: "Create event", icon: CalendarDays, capability: "events" },
    { href: `${base}/ads`, label: "Promote", icon: Megaphone, capability: "advertising" },
    { href: `${base}/members`, label: "Invite team", icon: Users, capability: "members" },
  ];
  const available = quickActions.filter((a) => ctx.can(a.capability));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={ENTITY_TYPE_LABEL[ctx.entity.entity_type]}
        title={ctx.entity.name}
        description="Your verified presence on BridgeConnect — everything you set up is managed here."
        actions={
          ctx.entity.status === "active" ? (
            <Button asChild variant="outline">
              <Link href={`/directory/${ctx.entity.slug}`}><ExternalLink aria-hidden /> View public page</Link>
            </Button>
          ) : null
        }
      />

      {available.length ? (
        <nav aria-label="Quick actions" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 xl:grid-cols-7">
          {available.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="pressable flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center text-xs font-medium shadow-xs hover:shadow-md sm:w-auto"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon aria-hidden className="size-5" />
              </span>
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {ctx.can("messages") ? <StatCard label="Unread conversations" value={unreadThreads} icon={Inbox} tone={unreadThreads ? "warning" : "primary"} href={`${base}/inbox`} /> : null}
        {ctx.can("bookings") ? <StatCard label="Upcoming bookings" value={summary.upcomingBookings.length} icon={CalendarCheck} tone="green" href={`${base}/bookings`} /> : null}
        {ctx.can("orders") ? <StatCard label="Pending orders" value={summary.pendingOrders} icon={Package} tone={summary.pendingOrders ? "warning" : "primary"} href={`${base}/orders?status=pending`} /> : null}
        {ctx.can("reviews") ? (
          <StatCard
            label="Average rating"
            value={summary.ratingAvg ? Number(summary.ratingAvg).toFixed(1) : "–"}
            hint={`${summary.ratingCount} reviews`}
            icon={Star}
            tone="warning"
            href={`${base}/reviews`}
          />
        ) : null}
        <StatCard label="Followers" value={summary.followers} icon={BellRing} tone="green" />
        {ctx.can("products") ? <StatCard label="Active products" value={summary.products} icon={ShoppingBag} href={`${base}/products`} /> : null}
        {ctx.can("services") ? <StatCard label="Active services" value={summary.services} icon={Wrench} tone="green" href={`${base}/services`} /> : null}
        {ctx.can("jobs") ? <StatCard label="Open jobs" value={summary.openJobs} icon={Briefcase} href={`${base}/jobs`} /> : null}
        {ctx.can("events") ? <StatCard label="Upcoming events" value={summary.upcomingEvents} icon={CalendarDays} tone="green" href={`${base}/events`} /> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {ctx.can("messages") ? (
          <Section title="Latest messages" action={<Link className="text-sm font-medium text-primary hover:underline" href={`${base}/inbox`}>Open inbox</Link>}>
            {summary.recentConversations.length === 0 ? (
              <EmptyState icon={Inbox} title="No open conversations" description="Residents can message you from your public page." />
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {summary.recentConversations.map((c) => {
                  const unread = isUnread({ ...c, user_last_read_at: null }, "entity");
                  const name = c.profiles?.display_name ?? "Resident";
                  return (
                    <li key={c.id}>
                      <Link href={`${base}/inbox/${c.id}`} className="flex items-center gap-3 p-3 hover:bg-accent">
                        <UserAvatar name={name} className="size-9" />
                        <span className="min-w-0 flex-1">
                          <span className={unread ? "block truncate font-bold" : "block truncate font-medium"}>{name}</span>
                          <span className="block truncate text-sm text-muted-foreground">{c.last_message_preview}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(c.last_message_at)}</span>
                        {unread ? <span className="size-2.5 rounded-full bg-primary"><span className="sr-only">Unread</span></span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        ) : null}

        {ctx.can("bookings") ? (
          <Section title="Upcoming bookings" action={<Link className="text-sm font-medium text-primary hover:underline" href={`${base}/bookings`}>All bookings</Link>}>
            {summary.upcomingBookings.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No upcoming bookings" description="Turn on online booking for your services to receive requests." />
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {summary.upcomingBookings.map((b) => (
                  <li key={b.id}>
                    <Link href={`${base}/bookings?status=${b.status}`} className="flex items-center justify-between gap-3 p-3 hover:bg-accent">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{b.services?.name} · {b.profiles?.display_name}</span>
                        <span className="block text-sm text-muted-foreground">
                          {formatDate(b.requested_date)}{b.requested_time ? ` at ${b.requested_time.slice(0, 5)}` : ""} · #{b.booking_number}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {ctx.can("orders") ? (
          <Section title="Recent orders" action={<Link className="text-sm font-medium text-primary hover:underline" href={`${base}/orders`}>All orders</Link>}>
            {summary.recentOrders.length === 0 ? (
              <EmptyState icon={Package} title="No orders yet" description="Orders placed on your products will appear here." />
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {summary.recentOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`${base}/orders/${o.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-accent">
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
      </div>

      <Section title="Your modules">
        <p className="text-sm text-muted-foreground">
          Enabled for this {ENTITY_TYPE_LABEL[ctx.entity.entity_type].toLowerCase()}: {ctx.capabilities.join(", ").replace(/_/g, " ")}.
          Need something else? <Link href={`${base}/support`} className="font-medium text-primary hover:underline">Contact Digital Bridge Initiative</Link>.
        </p>
      </Section>
    </div>
  );
}
