import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCommunityName } from "@/features/locations/queries";
import { AlertForm } from "@/features/workspace/components/alert-form";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceAlertsPage({ params }: PageProps<"/workspace/[entityId]/alerts">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "emergency_alerts");
  const community = await getCommunityName(ctx.entity.community_id);
  const scopes = community
    ? [
        { scope: "community" as const, id: community.id, label: community.name },
        { scope: "district" as const, id: community.districtId, label: community.districtName },
      ]
    : [];
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Emergency alerts" description="Warn residents about urgent health or safety issues in your area." />
      <Alert variant="warning"><AlertDescription>Only publish verified, urgent information. All alerts are logged and attributed to your organisation.</AlertDescription></Alert>
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <AlertForm entityId={entityId} scopes={scopes} redirectTo="/emergency" />
      </div>
    </div>
  );
}
