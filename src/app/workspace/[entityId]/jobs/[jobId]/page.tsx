import { Users } from "lucide-react";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { ApplicantList } from "@/features/workspace/components/applicant-list";
import { JobForm } from "@/features/workspace/components/listing-forms";
import { getEntityJob, listJobApplicants } from "@/features/workspace/queries";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceJobPage({ params }: PageProps<"/workspace/[entityId]/jobs/[jobId]">) {
  const { entityId, jobId } = await params;
  if (!isUuid(jobId)) notFound();
  const ctx = await requireWorkspaceCapability(entityId, "jobs");
  const job = await getEntityJob(entityId, jobId);
  if (!job) notFound();
  const [applicants, categories, communities] = await Promise.all([listJobApplicants(jobId), getCategories("job"), getCommunityOptions()]);
  const editable = job.status !== "removed";
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={job.title} actions={<StatusBadge status={job.status} />} description={job.moderation_reason ? `Removed by a moderator: ${job.moderation_reason}` : undefined} />
      <Tabs defaultValue="applicants">
        <TabsList>
          <TabsTrigger value="applicants">Applicants ({applicants.length})</TabsTrigger>
          {editable ? <TabsTrigger value="edit">Edit job</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="applicants">
          <Section title="Applicants">
            {applicants.length === 0 ? (
              <EmptyState icon={Users} title="No applicants yet" />
            ) : (
              <ApplicantList entityId={entityId} jobId={jobId} applicants={applicants} />
            )}
          </Section>
        </TabsContent>
        {editable ? (
          <TabsContent value="edit">
            <div className="rounded-xl border bg-card p-4 sm:p-6">
              <JobForm
                entityId={entityId}
                categories={categories}
                communities={communities}
                defaultCommunityId={ctx.entity.community_id}
                initial={{
                  jobId: job.id,
                  title: job.title,
                  categoryId: job.category_id ?? "",
                  communityId: job.community_id,
                  description: job.description,
                  requirements: job.requirements ?? "",
                  employmentType: job.employment_type,
                  locationNote: job.location_note ?? "",
                  salaryMin: job.salary_min ?? "",
                  salaryMax: job.salary_max ?? "",
                  salaryPeriod: job.salary_period ?? "",
                  applicationDeadline: job.application_deadline ?? "",
                  status: job.status as "draft" | "open" | "closed" | "archived",
                }}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
