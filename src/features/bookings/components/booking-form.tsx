"use client";

import { CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { requestBookingAction } from "../actions";
import { bookingRequestSchema } from "../schemas";

export function BookingDialog({
  serviceId,
  serviceName,
  providerName,
  signedIn,
}: {
  serviceId: string;
  serviceName: string;
  providerName: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Computed once per mount (date bounds for the picker; the server enforces them).
  const [{ today, max }] = useState(() => {
    const now = new Date();
    return {
      today: now.toISOString().slice(0, 10),
      max: new Date(now.getTime() + 365 * 86_400_000).toISOString().slice(0, 10),
    };
  });
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(bookingRequestSchema, requestBookingAction, {
    defaultValues: { serviceId, date: "", time: "", note: "", contactPhone: "" },
    onSuccess: () => {
      setOpen(false);
      router.push("/bookings");
    },
  });

  if (!signedIn) {
    return (
      <Button size="lg" onClick={() => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)}>
        <CalendarCheck aria-hidden /> Book an appointment
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <CalendarCheck aria-hidden /> Book an appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {serviceName}</DialogTitle>
          <DialogDescription>
            {providerName} will confirm or suggest another time. You&apos;ll get a notification either way.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="booking-date" label="Preferred date" required error={errorFor("date")}>
              <Input type="date" min={today} max={max} {...controlProps("booking-date", errorFor("date"))} {...form.register("date")} />
            </Field>
            <Field id="booking-time" label="Preferred time" error={errorFor("time")}>
              <Input type="time" step={900} {...controlProps("booking-time", errorFor("time"))} {...form.register("time")} />
            </Field>
          </div>
          <Field id="booking-phone" label="Phone number" required error={errorFor("contactPhone")}>
            <Input type="tel" autoComplete="tel" placeholder="+233 24 123 4567" {...controlProps("booking-phone", errorFor("contactPhone"))} {...form.register("contactPhone")} />
          </Field>
          <Field id="booking-note" label="Anything they should know?" error={errorFor("note")}>
            <Textarea rows={3} maxLength={1000} {...controlProps("booking-note", errorFor("note"))} {...form.register("note")} />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Sending request…" : "Request booking"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
