import { Package, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserAvatar } from "@/components/shared/avatars";
import { PlaceLine, RateTrip, RiderContact, TripTracker } from "@/features/mobility/components/trip-tracker";
import { getRiderPublic, getTrip } from "@/features/mobility/queries";
import { isUuid, requireViewer } from "@/lib/auth/session";
import { VEHICLE_LABEL } from "@/lib/fares";
import { formatDateTime, formatMoney } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Your trip", robots: noIndex };

export default async function TripPage({ params }: PageProps<"/rides/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/rides/${id}`);
  const trip = await getTrip(id);
  if (!trip || trip.customer_id !== viewer.id) notFound();
  const rider = await getRiderPublic(trip.rider_id);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-link uppercase">{trip.kind === "ride" ? "Ride" : "Delivery"} #{trip.trip_number}</p>
        <h1 className="text-2xl font-extrabold">
          {trip.status === "requested" ? "Finding you a rider…" : trip.status === "completed" ? "Trip completed" : trip.status === "cancelled" ? "Cancelled" : "Your rider is on the way"}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDateTime(trip.created_at)} · {formatMoney(trip.final_fare ?? trip.offered_fare, trip.currency)} · {trip.payment_method === "cash" ? "Cash" : "Mobile money"}</p>
      </header>

      <div className="rounded-2xl border bg-card p-4"><PlaceLine from={trip.pickup_address} to={trip.dropoff_address} /></div>
      {trip.package_description ? (
        <p className="flex items-start gap-2 rounded-2xl border bg-card p-4 text-sm"><Package aria-hidden className="size-4 shrink-0 text-warning-soft-foreground" /> {trip.package_description}{trip.recipient_name ? ` → ${trip.recipient_name}` : ""}</p>
      ) : null}

      {trip.rider && rider ? (
        <section className="space-y-3 rounded-2xl border bg-card p-4" aria-label="Your rider">
          <div className="flex items-center gap-3">
            <UserAvatar name={trip.rider.display_name} path={trip.rider.avatar_path} className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{trip.rider.display_name}</p>
              <p className="text-sm text-muted-foreground">{VEHICLE_LABEL[rider.vehicle_type].local} · {rider.vehicle_description}</p>
              {rider.plate_number ? <p className="inline-block rounded-md border bg-muted px-2 py-0.5 font-mono text-sm font-bold tracking-wider">{rider.plate_number}</p> : null}
            </div>
            {rider.rating_avg ? <p className="flex items-center gap-1 text-sm font-semibold"><Star aria-hidden className="size-4 fill-warning text-warning" /> {Number(rider.rating_avg).toFixed(1)}</p> : null}
          </div>
          {trip.status !== "completed" && trip.status !== "cancelled" ? <RiderContact name={trip.rider.display_name} phone={rider.phone} whatsapp={rider.whatsapp} /> : null}
        </section>
      ) : null}

      <section className="rounded-2xl border bg-card p-4">
        <TripTracker tripId={trip.id} status={trip.status} kind={trip.kind} />
      </section>

      {trip.status === "completed" && !trip.rated_at && trip.rider_id ? <RateTrip tripId={trip.id} /> : null}
      {trip.rated_at ? <p className="text-center text-sm text-muted-foreground">You rated this trip {trip.customer_rating}★. Thank you!</p> : null}
    </div>
  );
}
