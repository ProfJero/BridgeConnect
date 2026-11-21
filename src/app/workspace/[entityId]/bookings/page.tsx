import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { BookingCard } from "@/features/bookings/components/booking-card";
import { listEntityBookings } from "@/features/bookings/queries";
import { BOOKING_STATUSES, type BookingStatus } from "@/features/bookings/schemas";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function WorkspaceBookingsPage({ params, searchParams }: PageProps<"/workspace/[entityId]/bookings">) {
  const { entityId } = await params;
  const sp = await searchParams;
  await requireWorkspaceCapability(entityId, "bookings");
  const status = (BOOKING_STATUSES as readonly string[]).includes(String(sp.status)) ? (sp.status as BookingStatus) : "requested";
  const bookings = await listEntityBookings(entityId, status);
  const base = `/workspace/${entityId}/bookings`;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Bookings" description="Appointment requests for your services. Confirm, decline or complete them here." />
      <nav aria-label="Filter bookings" className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border bg-muted p-1">
        {BOOKING_STATUSES.map((s) => (
          <Link
            key={s}
            href={`${base}?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium text-muted-foreground",
              status === s && "bg-card text-foreground shadow-xs",
            )}
          >
            {s === "requested" ? "New requests" : humanize(s)}
          </Link>
        ))}
      </nav>
      {bookings.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Nothing here" description="Booking requests appear when residents book one of your services." />
      ) : (
        <div className="space-y-3">{bookings.map((b) => <BookingCard key={b.id} booking={b} side="entity" />)}</div>
      )}
    </div>
  );
}
