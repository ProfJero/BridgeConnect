import { Briefcase, PlusCircle } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listEntityJobs } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatDate, humanize } from "@/lib/format";

export default async function WorkspaceJobsPage({ params }: PageProps<"/workspace/[entityId]/jobs">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "jobs");
  const jobs = await listEntityJobs(entityId);
  const base = `/workspace/${entityId}/jobs`;
  return (
    <div className="space-y-5">
      <PageHeader title="Jobs" actions={<Button asChild><Link href={`${base}/new`}><PlusCircle aria-hidden /> Post a job</Link></Button>} />
      {jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs posted" description="Reach local talent by posting a job." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`${base}/${j.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                <span>
                  <span className="block font-semibold">{j.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {humanize(j.employment_type)} · {j.job_applications[0]?.count ?? 0} applicants
                    {j.application_deadline ? ` · closes ${formatDate(j.application_deadline)}` : ""}
                  </span>
                  {j.moderation_reason ? <span className="block text-xs text-destructive">Removed: {j.moderation_reason}</span> : null}
                </span>
                <StatusBadge status={j.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
