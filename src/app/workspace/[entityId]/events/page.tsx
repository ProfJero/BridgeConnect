import { CalendarDays, PlusCircle } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listEntityEvents } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function WorkspaceEventsPage({ params }: PageProps<"/workspace/[entityId]/events">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "events");
  const events = await listEntityEvents(entityId);
  const base = `/workspace/${entityId}/events`;
  return (
    <div className="space-y-5">
      <PageHeader title="Events" actions={<Button asChild><Link href={`${base}/new`}><PlusCircle aria-hidden /> Create event</Link></Button>} />
      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No events yet" description="Invite your community to workshops, outreaches and more." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {events.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 p-4">
              <span>
                {e.status === "removed" ? <span className="font-semibold">{e.title}</span> : <Link href={`${base}/${e.id}`} className="font-semibold text-primary hover:underline">{e.title}</Link>}
                <span className="block text-sm text-muted-foreground">{formatDateTime(e.starts_at)} · {e.going_count}{e.capacity ? `/${e.capacity}` : ""} going</span>
                {e.moderation_reason ? <span className="block text-xs text-destructive">Removed: {e.moderation_reason}</span> : null}
              </span>
              <StatusBadge status={e.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
