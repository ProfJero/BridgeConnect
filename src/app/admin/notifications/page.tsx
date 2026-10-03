import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BroadcastForm } from "@/features/admin/components/admin-forms";
import { getLocationTree } from "@/features/admin/queries";
import { can } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";

export default async function AdminNotificationsPage() {
  const viewer = await requireAdminPermission("notifications.broadcast");
  const locations = await getLocationTree();
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Broadcast notification" description="Send an in-app notification to residents. For emergencies, use Emergency alerts instead." />
      <Card><CardContent><BroadcastForm locations={locations} allowPlatform={can(viewer.grants, "notifications.broadcast")} /></CardContent></Card>
    </div>
  );
}
