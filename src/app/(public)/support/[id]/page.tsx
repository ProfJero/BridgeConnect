import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { RequesterTicketControls } from "@/features/support/components/ticket-controls";
import { TicketThread } from "@/features/support/components/ticket-thread";
import { getTicket } from "@/features/support/queries";
import { TICKET_CATEGORY_LABEL } from "@/features/support/schemas";
import { isUuid, requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Support ticket", robots: noIndex };

export default async function TicketPage({ params }: PageProps<"/support/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/support/${id}`);
  const data = await getTicket(id);
  if (!data || data.ticket.requester_id !== viewer.id) notFound();
  const { ticket, messages } = data;
  const closed = ticket.status === "closed";
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/support"><ArrowLeft aria-hidden /> Support</Link></Button>
      <PageHeader
        eyebrow={`Ticket #${ticket.ticket_number} · ${TICKET_CATEGORY_LABEL[ticket.category]}`}
        title={ticket.subject}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} label={ticket.status === "pending" ? "Awaiting your reply" : undefined} />
            {!closed && ticket.status !== "resolved" ? <RequesterTicketControls ticketId={id} /> : null}
          </div>
        }
      />
      <TicketThread ticketId={id} messages={messages} canReply={!closed} closedReason="This ticket is closed. Open a new one if you still need help." />
    </div>
  );
}
