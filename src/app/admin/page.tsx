import { BadgeCheck, Briefcase, CalendarDays, Flag, Megaphone, Package, ShoppingBag, Siren, Users } from "lucide-react";
import Link from "next/link";

import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { getPlatformStats } from "@/features/admin/queries";
import { canAnywhere } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";
import type { EntityType } from "@/features/directory/constants";

export default async function AdminDashboard() {
  const viewer = await requireAdminPermission("admin.access");
  const platformScope = viewer.grants.some((g) => g.permission === "analytics.read" && g.scope === "platform");
  // Scoped admins see stats for their first scoped area.
  const scoped = viewer.grants.find((g) => g.permission === "analytics.read");
  const { stats } = canAnywhere(viewer.grants, "analytics.read")
    ? await getPlatformStats(platformScope ? {} : { regionId: scoped?.regionId ?? undefined, districtId: scoped?.districtId ?? undefined, communityId: scoped?.communityId ?? undefined })
    : { stats: null };
  const can = (p: Parameters<typeof canAnywhere>[1]) => canAnywhere(viewer.grants, p);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="DBI Administration" title={`Welcome, ${viewer.profile.display_name.split(" ")[0]}`} description="What needs your attention across BridgeConnect." />
      {!stats ? (
        <Alert variant="info"><AlertDescription>Your role doesn&apos;t include analytics. Use the menu to reach the queues you manage.</AlertDescription></Alert>
      ) : (
        <>
          <Section title="Needs attention">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {can("entities.verify") ? <StatCard label="Pending verifications" value={stats.pending_applications} icon={BadgeCheck} tone={stats.pending_applications ? "warning" : "green"} href="/admin/verification" /> : null}
              {can("reports.read") ? <StatCard label="Open reports" value={stats.open_reports} icon={Flag} tone={stats.open_reports ? "destructive" : "green"} href="/admin/reports" /> : null}
              {can("ads.review") ? <StatCard label="Ads awaiting review" value={stats.pending_ads} icon={Megaphone} tone={stats.pending_ads ? "warning" : "green"} href="/admin/advertisements" /> : null}
              {can("emergency.publish") ? <StatCard label="Active emergency alerts" value={stats.active_alerts} icon={Siren} tone={stats.active_alerts ? "destructive" : "primary"} href="/admin/emergency" /> : null}
            </div>
          </Section>
          <Section title="Platform">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Active residents" value={stats.residents} icon={Users} href={can("users.read") ? "/admin/users" : undefined} />
              <StatCard label="Active products" value={stats.active_products} icon={ShoppingBag} />
              <StatCard label="Orders (30 days)" value={stats.orders_30d} icon={Package} tone="green" />
              <StatCard label="Open jobs" value={stats.open_jobs} icon={Briefcase} />
              <StatCard label="Upcoming events" value={stats.upcoming_events} icon={CalendarDays} tone="green" />
            </div>
          </Section>
          <div className="grid gap-4 xl:grid-cols-2">
            <BarChartCard title="New residents per day" description="Last 30 days" data={stats.daily.map((d) => ({ label: new Date(d.day).toLocaleDateString("en-GH", { day: "numeric", month: "short" }), value: d.signups }))} valueLabel="Sign-ups" />
            <BarChartCard
              title="Verified entities by type"
              layout="horizontal-bars"
              data={Object.entries(stats.entities_by_type).map(([k, v]) => ({ label: ENTITY_TYPE_LABEL[k as EntityType] ?? k, value: v })).sort((a, b) => b.value - a.value)}
              valueLabel="Entities"
            />
          </div>
          {can("analytics.read") ? <Link href="/admin/analytics" className="text-sm font-medium text-primary hover:underline">Open full analytics →</Link> : null}
        </>
      )}
    </div>
  );
}
