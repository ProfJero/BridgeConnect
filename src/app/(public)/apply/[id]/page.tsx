import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicantActions } from "@/features/applications/components/applicant-actions";
import { ApplicationTimeline } from "@/features/applications/components/application-timeline";
import { DocumentUploader } from "@/features/applications/components/document-uploader";
import { getApplication, signDocumentUrls } from "@/features/applications/queries";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { isUuid, requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage({ params }: PageProps<"/apply/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/apply/${id}`);
  const app = await getApplication(id);
  // Reviewers use the admin view; this page is only for the applicant.
  if (!app || app.applicant_id !== viewer.id) notFound();
  const urls = await signDocumentUrls(app.application_documents.map((d) => d.storage_path));
  const editable = viewer.isActive && (app.status === "submitted" || app.status === "info_requested");
  const latestInfoRequest = [...app.application_events].filter((e) => e.event === "info_requested").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Application" title={app.proposed_name} description={`${ENTITY_TYPE_LABEL[app.entity_type]} · ${SECTOR_LABEL[app.sector]} · ${app.communities?.name ?? ""}`} actions={<StatusBadge status={app.status} />} />
      {app.status === "approved" && app.entity_id ? (
        <Alert variant="success">
          <AlertTitle>Approved and verified</AlertTitle>
          <AlertDescription>
            Your workspace is ready.
            <Button asChild size="sm" className="mt-2"><Link href={`/workspace/${app.entity_id}`}>Open workspace <ArrowRight aria-hidden /></Link></Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {app.status === "info_requested" && latestInfoRequest ? (
        <Alert variant="warning">
          <AlertTitle>The reviewer needs more information</AlertTitle>
          <AlertDescription>{latestInfoRequest.note}</AlertDescription>
        </Alert>
      ) : null}
      {app.status === "rejected" ? (
        <Alert variant="destructive">
          <AlertTitle>Not approved</AlertTitle>
          <AlertDescription>{app.decision_reason}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader><CardTitle>Supporting documents</CardTitle></CardHeader>
        <CardContent>
          <DocumentUploader
            applicationId={app.id}
            userId={viewer.id}
            editable={editable}
            documents={app.application_documents.map((d) => ({ ...d, url: urls.get(d.storage_path) }))}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="whitespace-pre-line">{app.description}</p>
          <p><span className="text-muted-foreground">Phone:</span> {app.contact_phone}</p>
          {app.contact_email ? <p><span className="text-muted-foreground">Email:</span> {app.contact_email}</p> : null}
          {app.address ? <p><span className="text-muted-foreground">Address:</span> {app.address}</p> : null}
          {app.registration_number ? <p><span className="text-muted-foreground">Registration:</span> {app.registration_number}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent><ApplicationTimeline events={app.application_events} /></CardContent>
      </Card>
      <ApplicantActions
        applicationId={app.id}
        canResubmit={viewer.isActive && app.status === "info_requested"}
        canWithdraw={viewer.isActive && ["submitted", "under_review", "info_requested"].includes(app.status)}
      />
    </div>
  );
}
