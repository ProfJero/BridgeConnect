import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationForm } from "@/features/admin/components/admin-forms";
import { getLocationTree } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";

export default async function AdminLocationsPage() {
  await requireAdminPermission("locations.manage");
  const { regions, districts, communities } = await getLocationTree();
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Locations" description="Region → District → Community. Deactivate instead of deleting: history stays intact." />
      <Section title="Hierarchy">
        <div className="space-y-4">
          {regions.map((r) => (
            <Card key={r.id}>
              <CardHeader><CardTitle className="flex items-center gap-2">{r.name} {!r.is_active ? <StatusBadge status="archived" label="Inactive" /> : null}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {districts.filter((d) => d.region_id === r.id).map((d) => (
                  <div key={d.id} className="rounded-lg border p-3">
                    <p className="font-medium">{d.name} {!d.is_active ? <span className="text-xs text-muted-foreground">(inactive)</span> : null}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {communities.filter((c) => c.district_id === d.id).map((c) => (
                        <li key={c.id} className="rounded-full bg-muted px-3 py-1 text-sm">{c.name}{!c.is_active ? " (inactive)" : ""}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="Add locations">
        <Card><CardContent className="space-y-6 pt-1">
          <div><h3 className="mb-2 text-sm font-semibold">Region</h3><LocationForm kind="region" /></div>
          <div><h3 className="mb-2 text-sm font-semibold">District</h3><LocationForm kind="district" parents={regions} /></div>
          <div><h3 className="mb-2 text-sm font-semibold">Community</h3><LocationForm kind="community" parents={districts} /></div>
          <p className="text-xs text-muted-foreground">You can only add locations inside your administrative scope.</p>
        </CardContent></Card>
      </Section>
    </div>
  );
}
