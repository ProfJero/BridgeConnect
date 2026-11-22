import { Bike, Star, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { listRiderTrips, summariseEarnings } from "@/features/mobility/queries";
import { requireActiveViewer } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Trips & earnings", robots: noIndex };

export default async function RiderTripsPage() {
  const viewer = await requireActiveViewer("/rider/trips");
  const trips = await listRiderTrips(viewer.id, { limit: 200 });
  const e = summariseEarnings(trips);
  return (
    <div className="space-y-5">
      <PageHeader title="Trips & earnings" description="Your completed jobs and what you've earned through BridgeConnect." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Last 7 days" value={formatMoney(e.week, "GHS")} icon={Wallet} tone="green" />
        <StatCard label="Last 30 days" value={formatMoney(e.month, "GHS")} icon={Wallet} tone="green" />
        <StatCard label="Completed trips" value={e.completed} icon={Bike} />
        <StatCard label="Average rating" value={e.rating ? e.rating.toFixed(1) : "–"} hint={`${e.ratings} ratings`} icon={Star} tone="warning" />
      </div>
      {trips.length === 0 ? (
        <EmptyState icon={Bike} title="No trips yet" description="Go online on the Overview page to start receiving jobs." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {trips.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{t.kind === "ride" ? "Ride" : "Delivery"} #{t.trip_number} · {t.dropoff_address}</span>
                <span className="block text-xs text-muted-foreground">
                  {t.customer?.display_name ?? "Customer"} · {formatDateTime(t.created_at)}{t.customer_rating ? ` · ${t.customer_rating}★` : ""}
                </span>
              </span>
              <span className="shrink-0 space-y-1 text-right">
                <span className="block font-bold text-price">{formatMoney(t.final_fare ?? t.offered_fare, t.currency)}</span>
                <StatusBadge status={t.status === "in_progress" ? "under_review" : t.status === "accepted" || t.status === "arrived" ? "confirmed" : t.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
