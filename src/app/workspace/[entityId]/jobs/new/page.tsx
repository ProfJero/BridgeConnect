import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { JobForm } from "@/features/workspace/components/listing-forms";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function NewJobPage({ params }: PageProps<"/workspace/[entityId]/jobs/new">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "jobs");
  const [categories, communities] = await Promise.all([getCategories("job"), getCommunityOptions()]);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Post a job" />
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <JobForm entityId={entityId} categories={categories} communities={communities} defaultCommunityId={ctx.entity.community_id} />
      </div>
    </div>
  );
}
