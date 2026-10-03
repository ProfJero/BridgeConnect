import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApplicationForm } from "@/features/applications/components/application-form";
import { getCommunityOptions } from "@/features/locations/queries";
import { requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New application" };

export default async function NewApplicationPage() {
  const viewer = await requireViewer("/apply/new");
  if (!viewer.isActive) {
    return <Alert variant="destructive"><AlertDescription>Suspended accounts cannot apply.</AlertDescription></Alert>;
  }
  const communities = await getCommunityOptions();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="New application" description="After submitting, you'll be able to upload supporting documents." />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <ApplicationForm communities={communities} />
      </div>
    </div>
  );
}
