import { Bookmark, Briefcase, CalendarDays, Coins, Megaphone, ShoppingBag, ThumbsUp } from "lucide-react";

import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { getEntityAnalytics } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatMoney, humanize } from "@/lib/format";

export default async function WorkspaceAnalyticsPage({ params }: PageProps<"/workspace/[entityId]/analytics">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "analytics");
  const a = await getEntityAnalytics(entityId);
  const daily = a.daily_orders.map((d) => ({ label: new Date(d.day).toLocaleDateString("en-GH", { day: "numeric", month: "short" }), value: d.orders }));
  const byStatus = Object.entries(a.orders_by_status).map(([k, v]) => ({ label: humanize(k), value: v })).sort((x, y) => y.value - x.value);
  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" description="How residents engage with your organisation." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saved by residents" value={a.favourites} icon={Bookmark} />
        {ctx.can("orders") ? <StatCard label="Completed sales (30 days)" value={formatMoney(a.revenue_30d)} icon={Coins} tone="green" /> : null}
        {ctx.can("products") ? <StatCard label="Active products" value={a.products_active} icon={ShoppingBag} /> : null}
        {ctx.can("jobs") ? <StatCard label="Job applications" value={a.job_applications} icon={Briefcase} /> : null}
        {ctx.can("events") ? <StatCard label="Event RSVPs" value={a.event_rsvps} icon={CalendarDays} tone="green" /> : null}
        <StatCard label="Helpful reactions" value={a.post_reactions} icon={ThumbsUp} />
        {ctx.can("advertising") ? <StatCard label="Ad clicks" value={a.ad_clicks} icon={Megaphone} /> : null}
      </div>
      {ctx.can("orders") ? (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <BarChartCard title="Orders per day" description="Last 30 days" data={daily} valueLabel="Orders" />
          <BarChartCard title="Orders by status" description="All time" data={byStatus} layout="horizontal-bars" valueLabel="Orders" />
        </div>
      ) : null}
    </div>
  );
}
