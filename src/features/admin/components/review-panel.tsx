"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerAction } from "@/hooks/use-server-action";

import { reviewApplicationAction } from "../actions";

type Action = "start_review" | "request_info" | "approve" | "reject" | "note";

/** Reviewer decisions. The database enforces scope, state and "not your own". */
export function ReviewPanel({ applicationId, status, isOwn }: { applicationId: string; status: string; isOwn: boolean }) {
  const router = useRouter();
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(true);
  const act = (action: Action) =>
    run(() => reviewApplicationAction({ applicationId, action, note: note || undefined, internal: action === "note" ? internal : false }), {
      onSuccess: (data) => {
        setNote("");
        if (action === "approve" && data?.entityId) router.push(`/admin/entities/${data.entityId}`);
      },
    });

  if (isOwn) return <p className="text-sm text-muted-foreground">You cannot review your own application.</p>;
  const open = ["submitted", "under_review", "info_requested"].includes(status);
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="review-note">Note / reason</Label>
        <Textarea id="review-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby="review-note-hint" />
        <p id="review-note-hint" className="text-xs text-muted-foreground">Required to request information or reject (sent to the applicant).</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {status === "submitted" ? <Button disabled={pending} onClick={() => act("start_review")}>Start review</Button> : null}
        {status === "under_review" ? <Button variant="green" disabled={pending} onClick={() => act("approve")}>Approve & verify</Button> : null}
        {open ? <Button variant="outline" disabled={pending || note.trim().length < 10} onClick={() => act("request_info")}>Request information</Button> : null}
        {open ? <Button variant="destructive" disabled={pending || note.trim().length < 10} onClick={() => act("reject")}>Reject</Button> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-3">
        <Label className="font-normal"><Checkbox checked={internal} onCheckedChange={(v) => setInternal(v === true)} /> Internal (hidden from applicant)</Label>
        <Button variant="ghost" size="sm" disabled={pending || note.trim().length === 0} onClick={() => act("note")}>Add note</Button>
      </div>
    </div>
  );
}
