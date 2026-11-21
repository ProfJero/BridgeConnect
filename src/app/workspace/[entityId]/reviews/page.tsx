import { Star } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReviewReplyForm } from "@/features/reviews/components/review-reply-form";
import { RatingSummary, ReviewItem } from "@/features/reviews/components/review-list";
import { getRatingDistribution, listWorkspaceReviews } from "@/features/reviews/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function WorkspaceReviewsPage({ params, searchParams }: PageProps<"/workspace/[entityId]/reviews">) {
  const { entityId } = await params;
  const sp = await searchParams;
  const ctx = await requireWorkspaceCapability(entityId, "reviews");
  const filter = sp.filter === "unanswered" ? "unanswered" : "all";
  const supabase = await createClient();
  const [reviews, distribution, { data: entity }] = await Promise.all([
    listWorkspaceReviews(entityId, filter),
    getRatingDistribution(entityId),
    supabase.from("entities").select("rating_avg, rating_count").eq("id", entityId).single(),
  ]);
  const base = `/workspace/${entityId}/reviews`;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Reviews" description="What residents say about you. A thoughtful public reply builds trust." />
      <RatingSummary average={entity?.rating_avg ?? null} count={entity?.rating_count ?? 0} distribution={distribution} />
      <nav aria-label="Filter reviews" className="flex gap-1 rounded-xl border bg-muted p-1 sm:w-fit">
        {(["all", "unanswered"] as const).map((f) => (
          <Link
            key={f}
            href={`${base}?filter=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={cn("flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium text-muted-foreground", filter === f && "bg-card text-foreground shadow-xs")}
          >
            {f === "all" ? "All reviews" : "Needs a reply"}
          </Link>
        ))}
      </nav>
      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews here" description="Reviews from residents appear here as they come in." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              entityName={ctx.entity.name}
              footer={
                r.status === "published" ? (
                  <div className="border-t pt-3"><ReviewReplyForm reviewId={r.id} entityId={entityId} initial={r.response} /></div>
                ) : (
                  <p className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                    <StatusBadge status={r.status} /> {r.moderation_reason ?? "Not visible to the public."}
                  </p>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
