"use client";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerAction } from "@/hooks/use-server-action";

import { updateTicketAction } from "../actions";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../schemas";

/** Staff controls (status, priority, assignment). Requesters get `RequesterTicketControls`. */
export function StaffTicketControls({
  ticketId,
  status,
  priority,
  assignedToMe,
}: {
  ticketId: string;
  status: (typeof TICKET_STATUSES)[number];
  priority: string;
  assignedToMe: boolean;
}) {
  const { pending, run } = useServerAction();
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <label htmlFor="ticket-status" className="text-xs font-medium text-muted-foreground">Status</label>
        <NativeSelect
          id="ticket-status"
          value={status}
          disabled={pending}
          onChange={(e) => run(() => updateTicketAction({ ticketId, status: e.target.value }))}
        >
          {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s[0]!.toUpperCase() + s.slice(1)}</option>)}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <label htmlFor="ticket-priority" className="text-xs font-medium text-muted-foreground">Priority</label>
        <NativeSelect
          id="ticket-priority"
          value={priority}
          disabled={pending}
          onChange={(e) => run(() => updateTicketAction({ ticketId, priority: e.target.value }))}
        >
          {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</option>)}
        </NativeSelect>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => updateTicketAction(assignedToMe ? { ticketId, unassign: true } : { ticketId, assignToMe: true }))}
      >
        {assignedToMe ? "Unassign me" : "Assign to me"}
      </Button>
    </div>
  );
}

export function RequesterTicketControls({ ticketId }: { ticketId: string }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => updateTicketAction({ ticketId, status: "resolved" }))}>
      My problem is solved
    </Button>
  );
}
