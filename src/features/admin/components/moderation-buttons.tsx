"use client";

import { Button } from "@/components/ui/button";

import { moderateAction, updateReportStatusAction } from "../actions";
import type { MODERATION_TARGETS } from "../schemas";
import { ReasonDialog } from "./reason-dialog";

type Target = (typeof MODERATION_TARGETS)[number];

export function ModerationButtons({
  targetType,
  targetId,
  reportId,
  status,
}: {
  targetType: Target;
  targetId: string;
  reportId?: string;
  /** Current content status, used to offer the sensible actions. */
  status?: string;
}) {
  const visible = !status || ["published", "active", "open", "out_of_stock", "pending_review"].includes(status);
  const isPost = targetType === "post" || targetType === "comment";
  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending_review" ? (
        <ReasonDialog trigger={<Button size="sm" variant="green">Approve</Button>} title="Approve and publish?" confirmLabel="Approve" minLength={3}
          onConfirm={(reason) => moderateAction({ targetType, targetId, action: "approve", reason, reportId })} />
      ) : null}
      {visible && isPost ? (
        <ReasonDialog trigger={<Button size="sm" variant="outline">Hide</Button>} title="Hide this content?" description="Hidden content is removed from public view and can be restored." confirmLabel="Hide" minLength={3}
          onConfirm={(reason) => moderateAction({ targetType, targetId, action: "hide", reason, reportId })} />
      ) : null}
      {status !== "removed" ? (
        <ReasonDialog trigger={<Button size="sm" variant="destructive">Remove</Button>} title="Remove this content?" description="The author is notified with your reason." confirmLabel="Remove" destructive minLength={3}
          onConfirm={(reason) => moderateAction({ targetType, targetId, action: "remove", reason, reportId })} />
      ) : null}
      {status && ["hidden", "removed"].includes(status) ? (
        <ReasonDialog trigger={<Button size="sm" variant="outline">Restore</Button>} title="Restore this content?" confirmLabel="Restore" minLength={3}
          onConfirm={(reason) => moderateAction({ targetType, targetId, action: "restore", reason, reportId })} />
      ) : null}
      {reportId ? (
        <ReasonDialog trigger={<Button size="sm" variant="ghost">Dismiss report</Button>} title="Dismiss this report?" description="No action will be taken on the content." confirmLabel="Dismiss" optional
          onConfirm={(note) => updateReportStatusAction({ reportId, status: "dismissed", note })} />
      ) : null}
    </div>
  );
}

/** For reports about accounts or listings: act on their admin page, then resolve here. */
export function ReportResolutionButtons({ reportId }: { reportId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ReasonDialog trigger={<Button size="sm">Mark resolved</Button>} title="Mark this report resolved?" description="Record what action you took." confirmLabel="Resolve" minLength={3}
        onConfirm={(note) => updateReportStatusAction({ reportId, status: "resolved", note })} />
      <ReasonDialog trigger={<Button size="sm" variant="ghost">Dismiss</Button>} title="Dismiss this report?" confirmLabel="Dismiss" optional
        onConfirm={(note) => updateReportStatusAction({ reportId, status: "dismissed", note })} />
    </div>
  );
}
