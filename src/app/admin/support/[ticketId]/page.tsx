import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffTicketControls } from "@/features/support/components/ticket-controls";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { getTicket } from "@/features/support/queries";
import { TICKET_CATEGORY_LABEL } from "@/features/support/schemas";
import { isUuid, requireAdminPermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export default async function AdminTicketPage({ params }: PageProps<"/admin/support/[ticketId]">) {
  const { ticketId } = await params;
  if (!isUuid(ticketId)) notFound();
  const viewer = await requireAdminPermission("support.manage");
  const data = await getTicket(ticketId);
  if (!data) notFound();
  const { ticket, messages } = data;
  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/admin/support"><ArrowLeft aria-hidden /> Support desk</Link></Button>
      <PageHeader
        eyebrow={`Ticket #${ticket.ticket_number} · ${TICKET_CATEGORY_LABEL[ticket.category]}`}
        title={ticket.subject}
        actions={<StatusBadge status={ticket.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <TicketThread ticketId={ticketId} messages={messages} canReply closedReason="" />
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Manage</CardTitle></CardHeader>
            <CardContent>
              <StaffTicketControls ticketId={ticketId} status={ticket.status} priority={ticket.priority} assignedToMe={ticket.assigned_to === viewer.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Requester</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <Link href={`/admin/users/${ticket.requester_id}`} className="font-medium text-primary hover:underline">
                  {ticket.requester?.display_name ?? "User"}
                </Link>
              </p>
              {ticket.entity_id ? (
                <p>Workspace: <Link href={`/admin/entities/${ticket.entity_id}`} className="text-primary hover:underline">{ticket.entities?.name ?? "Entity"}</Link></p>
              ) : null}
              <p className="text-muted-foreground">Opened {formatDateTime(ticket.created_at)}</p>
              <p className="text-muted-foreground">Assigned to {ticket.assignee?.display_name ?? "nobody"}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
