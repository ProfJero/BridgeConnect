"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";
import type { ActionResult } from "@/lib/action-result";

/**
 * Confirmation for sensitive administrative actions. A written reason is
 * required (and stored in the audit log by the database function).
 */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive = false,
  minLength = 5,
  optional = false,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  minLength?: number;
  optional?: boolean;
  onConfirm: (reason: string) => Promise<ActionResult<unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useServerAction();
  const valid = optional || reason.trim().length >= minLength;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="reason">{optional ? "Note (optional)" : "Reason"}</Label>
          <Textarea id="reason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby="reason-hint" />
          <p id="reason-hint" className="text-xs text-muted-foreground">{optional ? "Shared with the affected user where relevant." : `At least ${minLength} characters. Recorded in the audit log.`}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!valid || pending}
            onClick={() =>
              run(() => onConfirm(reason.trim()), {
                onSuccess: () => {
                  setOpen(false);
                  setReason("");
                },
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
