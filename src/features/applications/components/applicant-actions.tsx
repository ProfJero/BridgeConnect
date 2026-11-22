"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";

import { fastTrackApplicationAction, resubmitApplicationAction, withdrawApplicationAction } from "../actions";

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

/** Shown only to platform owners on their own pending application. */
export function OwnerFastTrackButton({ applicationId }: { applicationId: string }) {
  const { pending, run } = useServerAction();
  const router = useRouter();
  return (
    <Button
      size="lg"
      variant="green"
      className="w-full rounded-full"
      disabled={pending}
      onClick={() => run(() => fastTrackApplicationAction(applicationId), { onSuccess: (d) => d && router.push(`/workspace/${d.entityId}`) })}
    >
      Approve and set up now (platform owner)
    </Button>
  );
}
