import { BarChartCard } from "@/components/charts/bar-chart-card";
import { CHART_COLORS } from "@/components/charts/chart-colors";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { getLocationTree, getPlatformStats } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { uuidParam } from "@/lib/search-params";

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const viewer = await requireAdminPermission("analytics.read");
  const sp = await searchParams;
  const districtId = uuidParam(sp.district);
  const platform = viewer.grants.some((g) => g.permission === "analytics.read" && g.scope === "platform");
  const fallback = viewer.grants.find((g) => g.permission === "analytics.read");
  const scope = districtId ? { districtId } : platform ? {} : { regionId: fallback?.regionId ?? undefined, districtId: fallback?.districtId ?? undefined, communityId: fallback?.communityId ?? undefined };
  const [{ stats, error }, tree] = await Promise.all([getPlatformStats(scope), getLocationTree()]);
  const label = (day: string) => new Date(day).toLocaleDateString("en-GH", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Last 30 days of activity. Each chart is one measure, on its own scale."
        actions={
          <form className="flex gap-2" action="/admin/analytics">
            <label htmlFor="district" className="sr-only">District</label>
            <NativeSelect id="district" name="district" defaultValue={districtId ?? ""}>
              <option value="">{platform ? "All districts" : "My area"}</option>
              {tree.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </NativeSelect>
            <Button type="submit" variant="outline">Apply</Button>
          </form>
        }
      />
      {error || !stats ? (
        <Alert variant="destructive"><AlertDescription>You can only view analytics for areas within your scope.</AlertDescription></Alert>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <BarChartCard title="New residents" description="Per day" data={stats.daily.map((d) => ({ label: label(d.day), value: d.signups }))} valueLabel="Sign-ups" />
          <BarChartCard title="Community posts" description="Per day" data={stats.daily.map((d) => ({ label: label(d.day), value: d.posts }))} valueLabel="Posts" color={CHART_COLORS.secondary} />
          <BarChartCard title="Marketplace orders" description="Per day" data={stats.daily.map((d) => ({ label: label(d.day), value: d.orders }))} valueLabel="Orders" />
        </div>
      )}
    </div>
  );
}
