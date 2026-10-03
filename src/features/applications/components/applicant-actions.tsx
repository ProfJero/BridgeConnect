"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";

import { resubmitApplicationAction, withdrawApplicationAction } from "../actions";

export function ApplicantActions({ applicationId, canResubmit, canWithdraw }: { applicationId: string; canResubmit: boolean; canWithdraw: boolean }) {
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      {canResubmit ? (
        <div className="grid gap-2">
          <Label htmlFor="resubmit-note">Message to the reviewer (optional)</Label>
          <Textarea id="resubmit-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button disabled={pending} onClick={() => run(() => resubmitApplicationAction({ applicationId, note }))}>Resubmit for review</Button>
        </div>
      ) : null}
      {canWithdraw ? (
        <Button variant="outline" disabled={pending} onClick={() => run(() => withdrawApplicationAction(applicationId))}>Withdraw application</Button>
      ) : null}
    </div>
  );
}
