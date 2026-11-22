"use client";

import { CalendarDays, Clock, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";

import { updateBookingStatusAction } from "../actions";
import { allowedBookingTransitions, type BookingStatus } from "../schemas";

const ACTION_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirm",
  declined: "Decline",
  completed: "Mark completed",
  cancelled: "Cancel booking",
  requested: "Request",
};

export type BookingCardData = {
  id: string;
  booking_number: number;
  requested_date: string;
  requested_time: string | null;
  customer_note: string | null;
  contact_phone: string | null;
  status: BookingStatus;
  entity_note: string | null;
  services: { name: string; slug: string } | null;
  entities: { name: string; slug: string } | null;
  profiles: { display_name: string } | null;
};

export function BookingCard({ booking, side }: { booking: BookingCardData; side: "customer" | "entity" }) {
  const { pending, run } = useServerAction();
  const [note, setNote] = useState("");
  const transitions = allowedBookingTransitions(side, booking.status);
  const noteId = `booking-note-${booking.id}`;

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4" aria-label={`Booking ${booking.booking_number}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Booking #{booking.booking_number}</p>
          <h3 className="font-semibold">
            {booking.services ? <Link href={`/services/${booking.services.slug}`} className="hover:underline">{booking.services.name}</Link> : "Service"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {side === "customer" ? booking.entities?.name : booking.profiles?.display_name}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden className="size-4 text-muted-foreground" />{formatDate(booking.requested_date)}</span>
        {booking.requested_time ? (
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-4 text-muted-foreground" />{booking.requested_time.slice(0, 5)}</span>
        ) : null}
        {side === "entity" && booking.contact_phone ? (
          <a href={`tel:${booking.contact_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-link hover:underline">
            <Phone aria-hidden className="size-4" />{booking.contact_phone}
          </a>
        ) : null}
      </div>
      {booking.customer_note ? (
        <p className="rounded-lg bg-muted p-2.5 text-sm"><span className="font-medium">Note: </span>{booking.customer_note}</p>
      ) : null}
      {booking.entity_note ? (
        <p className="rounded-lg bg-primary-soft/60 p-2.5 text-sm"><span className="font-medium">From {booking.entities?.name ?? "the provider"}: </span>{booking.entity_note}</p>
      ) : null}
      {transitions.length ? (
        <div className="space-y-2 border-t pt-3">
          {side === "entity" ? (
            <div className="grid gap-1">
              <label htmlFor={noteId} className="text-xs font-medium text-muted-foreground">Message to the customer (optional)</label>
              <Input id={noteId} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please arrive 10 minutes early" />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={t === "confirmed" || t === "completed" ? "default" : "outline"}
                disabled={pending}
                onClick={() => {
                  if (t === "cancelled" && !window.confirm("Cancel this booking?")) return;
                  run(() => updateBookingStatusAction({ bookingId: booking.id, status: t, note }));
                }}
              >
                {ACTION_LABEL[t]}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
