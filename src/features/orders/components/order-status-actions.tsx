"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import { humanize } from "@/lib/format";

import { updateOrderStatusAction } from "../actions";
import type { OrderStatus } from "../schemas";

const LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  declined: "Decline",
  ready: "Mark ready",
  completed: "Mark completed",
  cancelled: "Cancel order",
};

/** Buttons for the transitions the current party may make (DB re-validates). */
export function OrderStatusActions({ orderId, transitions }: { orderId: string; transitions: OrderStatus[] }) {
  const { pending, run } = useServerAction();
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  if (transitions.length === 0) return null;
  const destructive = (s: OrderStatus) => s === "cancelled" || s === "declined";

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((status) => (
        <Button
          key={status}
          variant={destructive(status) ? "outline" : "default"}
          disabled={pending}
          onClick={() => (destructive(status) ? setConfirming(status) : run(() => updateOrderStatusAction({ orderId, status })))}
        >
          {LABEL[status] ?? humanize(status)}
        </Button>
      ))}
      <Dialog open={confirming !== null} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirming ? LABEL[confirming] : ""}</DialogTitle>
            <DialogDescription>The other party will be notified. Any reserved stock is released.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="order-note">Reason (optional)</Label>
            <Textarea id="order-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>Keep order</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                const status = confirming!;
                setConfirming(null);
                run(() => updateOrderStatusAction({ orderId, status, note: note || undefined }));
              }}
            >
              {confirming ? LABEL[confirming] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
