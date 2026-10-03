import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewPanel } from "@/features/admin/components/review-panel";
import { ApplicationTimeline } from "@/features/applications/components/application-timeline";
import { DocumentUploader } from "@/features/applications/components/document-uploader";
import { getApplication, signDocumentUrls } from "@/features/applications/queries";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { isUuid, requireAdminPermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function ApplicationReviewPage({ params }: PageProps<"/admin/verification/[applicationId]">) {
  const { applicationId } = await params;
  if (!isUuid(applicationId)) notFound();
  const viewer = await requireAdminPermission("entities.verify");
  // RLS returns the application only if it's in the reviewer's scope.
  const app = await getApplication(applicationId);
  if (!app) notFound();
  const urls = await signDocumentUrls(app.application_documents.map((d) => d.storage_path));

  return (
    <div className="grid max-w-6xl gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <PageHeader eyebrow="Application" title={app.proposed_name} description={`${ENTITY_TYPE_LABEL[app.entity_type]} · ${SECTOR_LABEL[app.sector]}`} actions={<StatusBadge status={app.status} />} />
        <Card>
          <CardHeader><CardTitle>Submitted details</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Applicant:</span> {app.profiles?.display_name} ({app.applicant_position ?? "role not given"})</p>
            <p><span className="text-muted-foreground">Community:</span> {app.communities?.name}, {app.communities?.districts?.name}</p>
            <p><span className="text-muted-foreground">Phone:</span> {app.contact_phone}</p>
            <p><span className="text-muted-foreground">Email:</span> {app.contact_email ?? "—"}</p>
            <p><span className="text-muted-foreground">Registration no.:</span> {app.registration_number ?? "—"}</p>
            <p><span className="text-muted-foreground">Address:</span> {app.address ?? "—"}</p>
            <p><span className="text-muted-foreground">Submitted:</span> {formatDateTime(app.submitted_at)}</p>
            <p className="whitespace-pre-line sm:col-span-2">{app.description}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
          <CardContent>
            <DocumentUploader applicationId={app.id} userId={app.applicant_id} editable={false} documents={app.application_documents.map((d) => ({ ...d, url: urls.get(d.storage_path) }))} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader><CardTitle>Decision</CardTitle></CardHeader>
          <CardContent><ReviewPanel applicationId={app.id} status={app.status} isOwn={app.applicant_id === viewer.id} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent><ApplicationTimeline events={app.application_events} showActors /></CardContent>
        </Card>
      </div>
    </div>
  );
}
