"use client";

import { CalendarSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { sendInquiryAction } from "../actions";
import { inquirySchema } from "../schemas";

export function InquiryDialog({ rentalId, title, signedIn }: { rentalId: string; title: string; signedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(inquirySchema, sendInquiryAction, {
    defaultValues: { rentalId, message: `Hello, is "${title}" still available? I'd like to view it.`, contactPhone: "", preferredDate: "" },
    onSuccess: () => setOpen(false),
  });
  if (!signedIn) {
    return (
      <Button size="lg" className="flex-1 rounded-full" onClick={() => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)}>
        <CalendarSearch aria-hidden /> Request a viewing
      </Button>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="flex-1 rounded-full"><CalendarSearch aria-hidden /> Request a viewing</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a viewing</DialogTitle>
          <DialogDescription>The landlord gets your message and phone number and will call you to arrange a visit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <Field id="inq-message" label="Message" required error={errorFor("message")}>
            <Textarea rows={4} maxLength={1000} {...controlProps("inq-message", errorFor("message"))} {...form.register("message")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="inq-phone" label="Your phone" required error={errorFor("contactPhone")}>
              <Input type="tel" autoComplete="tel" {...controlProps("inq-phone", errorFor("contactPhone"))} {...form.register("contactPhone")} />
            </Field>
            <Field id="inq-date" label="Preferred day" error={errorFor("preferredDate")}>
              <Input type="date" {...controlProps("inq-date", errorFor("preferredDate"))} {...form.register("preferredDate")} />
            </Field>
          </div>
          <Button type="submit" className="rounded-full" disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
