import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { listMyBookings } from "@/features/bookings/queries";
import { requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "My bookings", robots: noIndex };

export default async function BookingsPage() {
  const viewer = await requireViewer("/bookings");
  const bookings = await listMyBookings(viewer.id);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => ["requested", "confirmed"].includes(b.status) && b.requested_date >= today);
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="My bookings" description="Appointments you've requested with local services." />
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings yet"
          description="Find a clinic, tailor, mechanic or trainer and book a time that suits you."
          action={<Button asChild><Link href="/services">Browse services</Link></Button>}
        />
      ) : (
        <>
          <Section title={`Upcoming (${upcoming.length})`}>
            {upcoming.length ? (
              <div className="space-y-3">{upcoming.map((b) => <BookingCard key={b.id} booking={b} side="customer" />)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing coming up.</p>
            )}
          </Section>
          {past.length ? (
            <Section title="Past and cancelled">
              <div className="space-y-3">{past.map((b) => <BookingCard key={b.id} booking={b} side="customer" />)}</div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
