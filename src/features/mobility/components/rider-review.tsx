"use client";

import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { useServerAction } from "@/hooks/use-server-action";

import { reviewRiderAction } from "../actions";

export function RiderReviewButtons({ riderId, status }: { riderId: string; status: "pending" | "approved" | "suspended" | "rejected" }) {
  const { pending, run } = useServerAction();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" ? (
        <Button size="sm" variant="green" disabled={pending} onClick={() => run(() => reviewRiderAction(riderId, "approved"))}>Approve</Button>
      ) : null}
      {status === "pending" ? (
        <ReasonDialog
          trigger={<Button size="sm" variant="outline">Reject</Button>}
          title="Reject rider"
          description="Tell the applicant why (shown to them)."
          confirmLabel="Reject"
          destructive
          onConfirm={(reason) => reviewRiderAction(riderId, "rejected", reason)}
        />
      ) : null}
      {status === "approved" ? (
        <ReasonDialog
          trigger={<Button size="sm" variant="outline" className="text-destructive">Suspend</Button>}
          title="Suspend rider"
          description="They go offline immediately and can't accept jobs."
          confirmLabel="Suspend"
          destructive
          onConfirm={(reason) => reviewRiderAction(riderId, "suspended", reason)}
        />
      ) : null}
    </div>
  );
}
