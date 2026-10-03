import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { WithdrawApplicationButton } from "@/features/jobs/components/withdraw-button";
import { listMyJobApplications } from "@/features/jobs/queries";
import { requireViewer } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My job applications" };

export default async function MyApplicationsPage() {
  await requireViewer("/jobs/applications");
  const applications = await listMyJobApplications();
  return (
    <div className="space-y-5">
      <PageHeader title="My job applications" />
      {applications.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No applications yet" action={<Button asChild><Link href="/jobs">Browse jobs</Link></Button>} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {applications.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                {a.jobs ? <Link href={`/jobs/${a.jobs.slug}`} className="font-semibold hover:underline">{a.jobs.title}</Link> : <span className="font-semibold">Job removed</span>}
                <p className="text-sm text-muted-foreground">{a.jobs?.entities?.name} · Applied {formatDate(a.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {["submitted", "reviewing", "shortlisted"].includes(a.status) ? <WithdrawApplicationButton applicationId={a.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
