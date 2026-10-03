"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { submitReportAction } from "@/features/reports/actions";
import { REPORT_REASON_LABEL, REPORT_REASONS, reportSchema, type ReportTargetKind } from "@/features/reports/schemas";
import { useActionForm } from "@/hooks/use-action-form";

export function ReportDialog({
  targetKind,
  targetId,
  signedIn,
  variant = "ghost",
}: {
  targetKind: ReportTargetKind;
  targetId: string;
  signedIn: boolean;
  variant?: "ghost" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(reportSchema, submitReportAction, {
    defaultValues: { targetKind, targetId, details: "" },
    onSuccess: () => {
      setOpen(false);
      form.reset();
    },
  });

  if (!signedIn) {
    return (
      <Button
        variant={variant}
        size="sm"
        onClick={() => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)}
      >
        <Flag aria-hidden /> Report
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Flag aria-hidden /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetKind === "entity" ? "listing" : targetKind}</DialogTitle>
          <DialogDescription>
            Reports are confidential and reviewed by trained community moderators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <Field id="reason" label="Reason" required error={errorFor("reason")}>
            <NativeSelect {...controlProps("reason", errorFor("reason"))} {...form.register("reason")} defaultValue="">
              <option value="" disabled>
                Choose a reason
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABEL[r]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="details" label="Details" error={errorFor("details")}>
            <Textarea rows={3} maxLength={2000} {...controlProps("details", errorFor("details"))} {...form.register("details")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
