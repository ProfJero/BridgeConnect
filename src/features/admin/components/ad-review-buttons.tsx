"use client";

import { Button } from "@/components/ui/button";

import { reviewAdAction } from "../actions";
import { ReasonDialog } from "./reason-dialog";

export function AdReviewButtons({ adId }: { adId: string }) {
  return (
    <div className="flex gap-2">
      <ReasonDialog trigger={<Button size="sm" variant="green">Approve</Button>} title="Approve this advertisement?" confirmLabel="Approve" optional
        onConfirm={(note) => reviewAdAction({ adId, decision: "approved", note })} />
      <ReasonDialog trigger={<Button size="sm" variant="destructive">Reject</Button>} title="Reject this advertisement?" confirmLabel="Reject" destructive
        onConfirm={(note) => reviewAdAction({ adId, decision: "rejected", note })} />
    </div>
  );
}
