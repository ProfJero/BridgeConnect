import { Briefcase, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { salaryText } from "@/components/cards/listing-cards";
import { EntityAvatar } from "@/components/shared/avatars";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isFavourite } from "@/features/favourites/queries";
import { ApplyForm } from "@/features/jobs/components/apply-form";
import { getJobBySlug, getMyApplicationForJob } from "@/features/jobs/queries";
import { getViewer } from "@/lib/auth/session";
import { formatDate, formatRelative, humanize } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const job = await getJobBySlug((await params).slug);
  return { title: job?.title ?? "Job not found" };
}

export default async function JobPage({ params }: PageProps<"/jobs/[slug]">) {
  const { slug } = await params;
  const [job, viewer] = await Promise.all([getJobBySlug(slug), getViewer()]);
  if (!job) notFound();
  const [saved, application] = await Promise.all([
    isFavourite("job", job.id, viewer?.id),
    viewer ? getMyApplicationForJob(job.id, viewer.id) : null,
  ]);
  const employer = job.entities;
  const isEmployer = viewer?.workspaces.some((w) => w.entityId === employer.id) ?? false;
  const deadlinePassed = job.application_deadline ? new Date(job.application_deadline) < new Date(new Date().toDateString()) : false;
  const open = job.status === "open" && !deadlinePassed;
  const salary = salaryText(job);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <article className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="soft"><Briefcase aria-hidden /> {humanize(job.employment_type)}</Badge>
            {job.listing_categories ? <Badge variant="secondary">{job.listing_categories.name}</Badge> : null}
            {job.status !== "open" ? <StatusBadge status={job.status} /> : null}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
          <Link href={`/directory/${employer.slug}`} className="flex items-center gap-2 hover:underline">
            <EntityAvatar name={employer.name} path={employer.logo_path} className="size-8" />
            <span className="font-medium">{employer.name}</span> <VerifiedBadge compact />
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {job.communities ? <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="size-4" /> {job.communities.name}{job.location_note ? ` · ${job.location_note}` : ""}</span> : null}
            {job.application_deadline ? <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-4" /> Apply by {formatDate(job.application_deadline)}</span> : null}
            {job.published_at ? <span>Posted {formatRelative(job.published_at)}</span> : null}
          </div>
          {salary ? <p className="text-lg font-semibold">{salary}</p> : null}
        </div>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">About the role</h2>
          <p className="leading-relaxed whitespace-pre-line">{job.description}</p>
        </section>
        {job.requirements ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Requirements</h2>
            <p className="leading-relaxed whitespace-pre-line">{job.requirements}</p>
          </section>
        ) : null}
        <div className="flex gap-2">
          <FavouriteButton kind="job" id={job.id} initial={saved} signedIn={Boolean(viewer)} />
          {!isEmployer ? <ReportDialog targetKind="job" targetId={job.id} signedIn={Boolean(viewer)} variant="outline" /> : null}
        </div>
      </article>
      <aside>
        <Card>
          <CardHeader><CardTitle className="text-base">Apply</CardTitle></CardHeader>
          <CardContent>
            {application ? (
              <Alert variant="info">
                <AlertDescription>
                  <span className="flex flex-wrap items-center gap-2">You applied {formatRelative(application.created_at)}. <StatusBadge status={application.status} /></span>
                  <Link href="/jobs/applications" className="font-semibold underline">View your applications</Link>
                </AlertDescription>
              </Alert>
            ) : isEmployer ? (
              <Alert variant="info"><AlertDescription>You manage this job. <Link className="font-semibold underline" href={`/workspace/${employer.id}/jobs/${job.id}`}>View applicants</Link></AlertDescription></Alert>
            ) : !open ? (
              <Alert variant="warning"><AlertDescription>This job is no longer accepting applications.</AlertDescription></Alert>
            ) : !viewer ? (
              <Button asChild className="w-full"><Link href={`/sign-in?next=/jobs/${job.slug}`}>Sign in to apply</Link></Button>
            ) : !viewer.isActive ? (
              <Alert variant="destructive"><AlertDescription>Your account is suspended.</AlertDescription></Alert>
            ) : (
              <ApplyForm jobId={job.id} userId={viewer.id} />
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
