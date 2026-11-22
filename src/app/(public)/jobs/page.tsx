import { Briefcase, ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { JobCard } from "@/components/cards/listing-cards";
import { CategoryChips } from "@/components/shared/category-chips";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { SearchForm } from "@/components/widgets/search-form";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/features/jobs/queries";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { enumParam, stringParam, uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Jobs",
  description:
    "Latest job vacancies from verified employers in your community: full-time, part-time, internships and apprenticeships.",
  path: "/jobs",
  image: "/og/jobs.png",
});

const JOB_TYPES = ["full_time", "part_time", "contract", "internship", "apprenticeship", "volunteer"] as const;
const TYPE_CHIPS = [
  { slug: "full_time", name: "Full time" },
  { slug: "part_time", name: "Part time" },
  { slug: "contract", name: "Contract" },
  { slug: "internship", name: "Internship" },
  { slug: "apprenticeship", name: "Apprenticeship" },
  { slug: "volunteer", name: "Volunteer" },
];

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const communityId = uuidParam(sp.community);
  const page = parsePage(sp.page);
  const [categories, communities] = await Promise.all([getCategories("job"), getCommunityOptions()]);
  const category = categories.find((c) => c.slug === stringParam(sp.category, 60));
  const type = enumParam(sp.type, JOB_TYPES);
  const result = await listJobs({ q, communityId, categoryId: category?.id, employmentType: type, page });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Jobs"
        description="Opportunities from verified employers in your area."
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/jobs/applications"><ClipboardList aria-hidden /> My applications</Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/jobs" defaultValue={q} placeholder="Search jobs" hidden={{ community: communityId, category: category?.slug }} />
        <CommunityFilter options={communities} value={communityId} />
      </div>
      <CategoryChips basePath="/jobs" param="type" label="Job type" allLabel="All jobs" categories={TYPE_CHIPS} active={type} preserve={{ q, community: communityId, category: category?.slug }} />
      {result.items.length === 0 ? (
        <EmptyState icon={Briefcase} title="No open jobs found" description="Check back soon — verified employers post new opportunities regularly." />
      ) : (
        <div className="stagger grid gap-3 lg:grid-cols-2">{result.items.map((j) => <JobCard key={j.id} job={j} />)}</div>
      )}
      <Pagination page={page} pageSize={result.pageSize} total={result.total} basePath="/jobs" searchParams={{ q, community: communityId, category: category?.slug, type }} />
    </div>
  );
}
