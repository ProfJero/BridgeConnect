import { MessageSquareQuote } from "lucide-react";

import { UserAvatar } from "@/components/shared/avatars";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { formatRelative } from "@/lib/format";

import type { ReviewData } from "../queries";
import { RatingStars } from "./rating-stars";

export function ReviewItem({
  review,
  entityName,
  viewerId,
  footer,
}: {
  review: ReviewData;
  entityName: string;
  viewerId?: string;
  footer?: React.ReactNode;
}) {
  const name = review.profiles?.display_name ?? "Resident";
  return (
    <article className="space-y-2 rounded-xl border bg-card p-4" aria-label={`Review by ${name}`}>
      <div className="flex items-start gap-3">
        <UserAvatar name={name} path={review.profiles?.avatar_path} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{name}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <RatingStars value={review.rating} />
            <time dateTime={review.created_at}>{formatRelative(review.created_at)}</time>
            {review.edited_at ? <span>· edited</span> : null}
          </p>
        </div>
        {viewerId && viewerId !== review.author_id ? (
          <ReportDialog targetKind="review" targetId={review.id} signedIn />
        ) : null}
      </div>
      {review.title ? <h3 className="font-semibold">{review.title}</h3> : null}
      {review.body ? <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p> : null}
      {review.response ? (
        <div className="ml-4 rounded-lg border-l-4 border-primary bg-primary-soft/50 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary-soft-foreground">
            <MessageSquareQuote aria-hidden className="size-3.5" /> Reply from {entityName}
          </p>
          <p className="whitespace-pre-line">{review.response}</p>
        </div>
      ) : null}
      {footer}
    </article>
  );
}

export function RatingSummary({
  average,
  count,
  distribution,
}: {
  average: number | null;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <div className="text-center sm:w-32">
        <p className="text-4xl font-bold tabular-nums">{average ? Number(average).toFixed(1) : "–"}</p>
        <RatingStars value={average ? Number(average) : null} size="md" />
        <p className="text-xs text-muted-foreground">{count} {count === 1 ? "review" : "reviews"}</p>
      </div>
      <dl className="flex-1 space-y-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const pct = count ? Math.round((distribution[star] / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <dt className="w-10 shrink-0 tabular-nums">{star} star</dt>
              <dd className="flex flex-1 items-center gap-2">
                <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-9 text-right tabular-nums text-muted-foreground">{distribution[star]}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
