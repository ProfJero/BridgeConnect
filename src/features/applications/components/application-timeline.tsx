import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, humanize } from "@/lib/format";

type Event = { id: string; event: string; note: string | null; is_internal: boolean; created_at: string; profiles: { display_name: string } | null };

const EVENT_STATUS: Record<string, string> = {
  submitted: "submitted",
  review_started: "under_review",
  info_requested: "info_requested",
  resubmitted: "submitted",
  approved: "approved",
  rejected: "rejected",
  withdrawn: "withdrawn",
  note: "draft",
};

export function ApplicationTimeline({ events, showActors = false }: { events: Event[]; showActors?: boolean }) {
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <ol className="space-y-4 border-l pl-4">
      {sorted.map((e) => (
        <li key={e.id} className="relative">
          <span aria-hidden className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={EVENT_STATUS[e.event] ?? "draft"} label={humanize(e.event)} />
            {e.is_internal ? <span className="text-xs font-semibold text-warning-soft-foreground">Internal note</span> : null}
            <time className="text-xs text-muted-foreground" dateTime={e.created_at}>{formatDateTime(e.created_at)}</time>
            {showActors && e.profiles ? <span className="text-xs text-muted-foreground">by {e.profiles.display_name}</span> : null}
          </div>
          {e.note ? <p className="mt-1 text-sm whitespace-pre-line">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
