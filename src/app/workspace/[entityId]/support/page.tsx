import { LifeBuoy, PlusCircle } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listMyTickets } from "@/features/support/queries";
import { getWorkspace } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";

export default async function WorkspaceSupportPage({ params }: PageProps<"/workspace/[entityId]/support">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  const tickets = (await listMyTickets(ctx.viewer.id)).filter((t) => t.entity_id === entityId);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Help & support"
        description={`Ask Digital Bridge Initiative about ${ctx.entity.name}: verification, capabilities, payments or anything else.`}
        actions={<Button asChild><Link href={`/support/new?entity=${entityId}&topic=verification`}><PlusCircle aria-hidden /> New ticket</Link></Button>}
      />
      {tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="No tickets for this workspace" description="Tickets you open about this organisation appear here." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/support/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">#{t.ticket_number} · {t.subject}</span>
                  <span className="block text-xs text-muted-foreground">Updated {formatRelative(t.last_activity_at)}</span>
                </span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
