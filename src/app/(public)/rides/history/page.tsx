import { Bike } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listMyTrips } from "@/features/mobility/queries";
import { requireViewer } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "My trips", robots: noIndex };

export default async function TripHistoryPage() {
  const viewer = await requireViewer("/rides/history");
  const trips = await listMyTrips(viewer.id, { limit: 100 });
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="My trips" description="Rides and deliveries you've requested." actions={<Button asChild size="sm" className="rounded-full"><Link href="/rides">New request</Link></Button>} />
      {trips.length === 0 ? (
        <EmptyState icon={Bike} title="No trips yet" description="Request a ride or send a package with a local rider." action={<Button asChild><Link href="/rides">Request a ride</Link></Button>} />
      ) : (
        <ul className="stagger divide-y overflow-hidden rounded-2xl border bg-card">
          {trips.map((t) => (
            <li key={t.id}>
              <Link href={`/rides/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-accent">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.kind === "ride" ? "Ride" : "Delivery"} to {t.dropoff_address}</span>
                  <span className="block text-xs text-muted-foreground">#{t.trip_number} · {formatDateTime(t.created_at)} · {formatMoney(t.final_fare ?? t.offered_fare, t.currency)}</span>
                </span>
                <StatusBadge status={t.status === "requested" ? "pending" : t.status === "in_progress" ? "under_review" : t.status === "accepted" || t.status === "arrived" ? "confirmed" : t.status} label={t.status === "requested" ? "Searching" : undefined} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
