import { Bike, Clock, MessageCircle, Phone, ShieldCheck, Star, Wallet } from "lucide-react";
import type { Metadata } from "next";

import { UserAvatar } from "@/components/shared/avatars";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCommunityOptions } from "@/features/locations/queries";
import { ActiveTripControls, AutoRefresh, OnlineSwitch, OpenRequestCard, RiderProfileForm, type OpenRequest } from "@/features/mobility/components/rider-app";
import { PlaceLine } from "@/features/mobility/components/trip-tracker";
import { getMyRiderProfile, listOpenRequests, listRiderTrips } from "@/features/mobility/queries";
import { requireActiveViewer } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Rider dashboard", robots: noIndex };

export default async function RiderPage() {
  const viewer = await requireActiveViewer("/rider");
  const [profile, communities] = await Promise.all([getMyRiderProfile(viewer.id), getCommunityOptions()]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green to-brand-navy p-6 text-white">
          <Bike aria-hidden className="size-12 opacity-90" />
          <h1 className="mt-2 text-2xl font-extrabold">Earn with BridgeConnect</h1>
          <p className="mt-1 text-sm opacity-90">
            Okada, tricycle, taxi or dispatch? Get ride and delivery requests from your community, set your own fares and hours.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="flex items-center gap-2"><ShieldCheck aria-hidden className="size-4" /> Verified by Digital Bridge Initiative</li>
            <li className="flex items-center gap-2"><Wallet aria-hidden className="size-4" /> Customers pay you directly — cash or mobile money</li>
            <li className="flex items-center gap-2"><Star aria-hidden className="size-4" /> Build your rating and get chosen by name</li>
          </ul>
        </section>
        <div className="rounded-2xl border bg-card p-4 sm:p-6"><RiderProfileForm communities={communities} /></div>
      </div>
    );
  }

  const initial = {
    vehicleType: profile.vehicle_type,
    vehicleDescription: profile.vehicle_description,
    plateNumber: profile.plate_number ?? "",
    offersRides: profile.offers_rides,
    offersDelivery: profile.offers_delivery,
    communityId: profile.community_id,
    serviceArea: profile.service_area ?? "",
    phone: profile.phone,
    whatsapp: profile.whatsapp ?? "",
    bio: profile.bio ?? "",
  };

  if (profile.status !== "approved") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Rider account" description="Your application to ride on BridgeConnect." />
        <div className="space-y-2 rounded-2xl border bg-card p-5">
          <StatusBadge status={profile.status === "pending" ? "pending_review" : profile.status} label={profile.status === "pending" ? "Awaiting verification" : undefined} />
          <p className="text-sm text-muted-foreground">
            {profile.status === "pending"
              ? "A DBI officer for your district will verify your details (usually within 2 working days). You'll get a notification."
              : profile.status_reason ?? "Contact DBI support for details."}
          </p>
        </div>
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Edit my details</summary>
          <div className="pt-4"><RiderProfileForm communities={communities} initial={initial} /></div>
        </details>
      </div>
    );
  }

  const [active, history, open] = await Promise.all([
    listRiderTrips(viewer.id, { active: true }),
    listRiderTrips(viewer.id, { limit: 30 }),
    profile.is_online ? listOpenRequests() : Promise.resolve([]),
  ]);
  const current = active[0];
  const today = new Date().toISOString().slice(0, 10);
  const todays = history.filter((t) => t.status === "completed" && t.completed_at?.slice(0, 10) === today);
  const earnings = todays.reduce((sum, t) => sum + Number(t.final_fare ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {profile.is_online ? <AutoRefresh seconds={15} /> : null}
      <PageHeader title={`Hi, ${viewer.profile.display_name.split(" ")[0]}`} description={`${profile.vehicle_description}${profile.plate_number ? ` · ${profile.plate_number}` : ""}`} />
      <OnlineSwitch online={profile.is_online} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Earned today" value={formatMoney(earnings, "GHS")} icon={Wallet} tone="green" />
        <StatCard label="Trips today" value={todays.length} icon={Clock} />
        <StatCard label="Rating" value={profile.rating_avg ? Number(profile.rating_avg).toFixed(1) : "–"} hint={`${profile.rating_count} ratings`} icon={Star} tone="warning" />
        <StatCard label="All trips" value={profile.completed_trips} icon={Bike} />
      </div>

      {current ? (
        <Section title="Current job">
          <article className="space-y-4 rounded-2xl border-2 border-primary/40 bg-card p-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={current.customer?.display_name ?? "Customer"} path={current.customer?.avatar_path} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{current.customer?.display_name ?? "Customer"}</p>
                <p className="text-sm text-muted-foreground">{current.kind === "ride" ? "Ride" : "Delivery"} #{current.trip_number} · {formatMoney(current.offered_fare, current.currency)} {current.payment_method === "cash" ? "cash" : "MoMo"}</p>
              </div>
              <a href={`tel:${current.customer_phone.replace(/\s/g, "")}`} aria-label="Call the customer" className="flex size-11 items-center justify-center rounded-full bg-brand-green text-brand-green-foreground"><Phone aria-hidden className="size-5" /></a>
              <a href={`https://wa.me/${current.customer_phone.replace(/[^0-9]/g, "").replace(/^0/, "233")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp the customer" className="flex size-11 items-center justify-center rounded-full border"><MessageCircle aria-hidden className="size-5" /></a>
            </div>
            <PlaceLine from={current.pickup_address} to={current.dropoff_address} />
            {current.package_description ? <p className="text-sm"><span className="font-medium">Package:</span> {current.package_description}{current.recipient_name ? ` → ${current.recipient_name}` : ""}{current.recipient_phone ? ` (${current.recipient_phone})` : ""}</p> : null}
            {current.note ? <p className="rounded-lg bg-muted p-2 text-sm">{current.note}</p> : null}
            <StatusBadge status="confirmed" label={current.status === "accepted" ? "Heading to pickup" : current.status === "arrived" ? "At pickup" : "On trip"} />
            <ActiveTripControls tripId={current.id} status={current.status as "accepted" | "arrived" | "in_progress"} offeredFare={Number(current.offered_fare)} pickupAddress={current.pickup_address} dropoffAddress={current.dropoff_address} />
          </article>
        </Section>
      ) : null}

      {profile.is_online ? (
        <Section title={`New requests (${open.length})`}>
          {open.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Waiting for requests near you… This page refreshes automatically.</p>
          ) : (
            <div className="space-y-3">{(open as OpenRequest[]).map((r) => <OpenRequestCard key={r.id} request={r} canAccept={!current} />)}</div>
          )}
        </Section>
      ) : null}

      {history.length ? (
        <Section title="Recent trips">
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {history.slice(0, 10).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">#{t.trip_number} · {t.dropoff_address}</span>
                  <span className="block text-xs text-muted-foreground">{formatDateTime(t.created_at)}{t.customer_rating ? ` · ${t.customer_rating}★` : ""}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{formatMoney(t.final_fare ?? t.offered_fare, t.currency)}</span>
                  <StatusBadge status={t.status === "in_progress" ? "under_review" : t.status === "accepted" || t.status === "arrived" ? "confirmed" : t.status} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-semibold">Edit rider profile</summary>
        <div className="pt-4"><RiderProfileForm communities={communities} initial={initial} /></div>
      </details>
    </div>
  );
}
