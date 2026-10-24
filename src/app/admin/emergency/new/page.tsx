import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getLocationTree } from "@/features/admin/queries";
import { AlertForm, type AlertScopeOption } from "@/features/workspace/components/alert-form";
import { grantCovers } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";

export default async function NewAlertPage() {
  const viewer = await requireAdminPermission("emergency.publish");
  const tree = await getLocationTree();
  const grants = viewer.grants.filter((g) => g.permission === "emergency.publish");
  const covers = (t: { regionId?: string; districtId?: string; communityId?: string }) => grants.some((g) => grantCovers(g, t));
  // Offer only areas within the admin's scope (the database re-checks).
  const scopes: AlertScopeOption[] = [
    ...tree.regions.filter((r) => covers({ regionId: r.id })).map((r) => ({ scope: "region" as const, id: r.id, label: r.name })),
    ...tree.districts.filter((d) => covers({ regionId: d.region_id, districtId: d.id })).map((d) => ({ scope: "district" as const, id: d.id, label: d.name })),
    ...tree.communities
      .filter((c) => {
        const d = tree.districts.find((x) => x.id === c.district_id);
        return covers({ regionId: d?.region_id, districtId: c.district_id, communityId: c.id });
      })
      .map((c) => ({ scope: "community" as const, id: c.id, label: c.name })),
  ];
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Issue an emergency alert" />
      <Alert variant="warning"><AlertDescription>Warning and critical alerts send an immediate notification to every resident in the area.</AlertDescription></Alert>
      <div className="rounded-xl border bg-card p-4 sm:p-6"><AlertForm scopes={scopes} redirectTo="/admin/emergency" /></div>
    </div>
  );
}
