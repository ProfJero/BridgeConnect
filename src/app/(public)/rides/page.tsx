import { ArrowRight, Bike, MessageCircle, Phone, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { getCommunityOptions } from "@/features/locations/queries";
import { TripRequestForm } from "@/features/mobility/components/trip-request-form";
import { listAvailableRiders, listMyTrips } from "@/features/mobility/queries";
import { getViewer, isUuid } from "@/lib/auth/session";
import { VEHICLE_LABEL } from "@/lib/fares";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = pageMetadata({
  title: "Rides & delivery — okada, tricycle, taxi and dispatch",
  description: "Request a verified okada, tricycle or taxi, or send a package with a local dispatch rider. Call riders directly or request in the app.",
  path: "/rides",
  image: "/og/rides.png",
});

export default async function RidesPage({ searchParams }: PageProps<"/rides">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const kind = sp.kind === "delivery" ? "delivery" : "ride";
  const communityId = viewer?.profile.home_community_id ?? undefined;
  const riderId = typeof sp.rider === "string" && isUuid(sp.rider) ? sp.rider : undefined;
  const orderId = typeof sp.order === "string" && isUuid(sp.order) ? sp.order : undefined;
  const supabase = await createClient();
  const [communities, active, riders, preferred, order] = await Promise.all([
    getCommunityOptions(),
    viewer ? listMyTrips(viewer.id, { active: true }) : Promise.resolve([]),
    viewer && communityId ? listAvailableRiders(communityId) : Promise.resolve([]),
    viewer && riderId
      ? supabase.from("rider_profiles").select("user_id, vehicle_type, profiles!rider_profiles_user_id_fkey(display_name)").eq("user_id", riderId).eq("status", "approved").maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    viewer && orderId
      ? supabase.from("orders").select("id, order_number, delivery_address, contact_phone, entities(name, address, communities(name))").eq("id", orderId).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={kind === "delivery" ? "Send a package" : "Get a ride"}
        description="Verified okada, tricycle, taxi and dispatch riders in your area."
        actions={viewer ? <Button asChild variant="outline" size="sm" className="rounded-full"><Link href="/rides/history">My trips</Link></Button> : null}
      />

      {active.length ? (
        <Section title="In progress">
          <ul className="space-y-2">
            {active.map((t) => (
              <li key={t.id}>
                <Link href={`/rides/${t.id}`} className="pressable flex items-center gap-3 rounded-2xl border-2 border-primary/40 bg-primary-soft/40 p-4">
                  <Bike aria-hidden className="size-6 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">#{t.trip_number} · {t.dropoff_address}</span>
                    <span className="block text-xs text-muted-foreground">{t.rider?.display_name ? `with ${t.rider.display_name}` : "Looking for a rider…"}</span>
                  </span>
                  <StatusBadge status={t.status === "requested" ? "pending" : t.status === "in_progress" ? "under_review" : "confirmed"} label={t.status === "requested" ? "Searching" : t.status.replace("_", " ")} />
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {viewer ? (
        viewer.isActive ? (
          <div className="rounded-3xl border bg-card p-4 shadow-xs sm:p-6">
            <TripRequestForm
              communities={communities}
              defaultCommunityId={communityId}
              defaultKind={orderId ? "delivery" : kind}
              orderId={order ? order.id : undefined}
              preferredRider={preferred ? { id: preferred.user_id, name: preferred.profiles?.display_name ?? "your rider", vehicle: preferred.vehicle_type } : null}
              defaults={order ? {
                pickupAddress: [order.entities?.name, order.entities?.address, order.entities?.communities?.name].filter(Boolean).join(", "),
                dropoffAddress: order.delivery_address ?? "",
                packageDescription: `Order #${order.order_number} from ${order.entities?.name ?? "a seller"}`,
                phone: order.contact_phone,
              } : undefined}
            />
          </div>
        ) : (
          <p className="rounded-2xl bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">Your account is suspended.</p>
        )
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-brand-navy to-primary p-6 text-center text-white">
          <Bike aria-hidden className="mx-auto size-12 opacity-90" />
          <h2 className="mt-2 text-xl font-bold">Rides and deliveries, the local way</h2>
          <p className="mx-auto mt-1 max-w-md text-sm opacity-90">Sign in to request a verified rider, follow your trip live and rate your rider.</p>
          <Button asChild variant="green" className="mt-4 rounded-full"><Link href="/sign-in?next=/rides">Sign in to request</Link></Button>
        </div>
      )}

      {riders.length ? (
        <Section title="Riders & drivers near you">
          <ul className="stagger space-y-2">
            {riders.map((r) => {
              const wa = (r.whatsapp ?? r.phone).replace(/[^0-9]/g, "").replace(/^0/, "233");
              return (
                <li key={r.user_id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  <div className="relative">
                    <UserAvatar name={r.display_name} path={r.avatar_path} className="size-12" />
                    <span className={r.is_online ? "absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-card bg-brand-green" : "absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-card bg-muted-foreground/50"}>
                      <span className="sr-only">{r.is_online ? "Online" : "Offline"}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {VEHICLE_LABEL[r.vehicle_type].local} · {r.vehicle_description}{r.plate_number ? ` · ${r.plate_number}` : ""}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {r.rating_avg ? <><Star aria-hidden className="size-3 fill-warning text-warning" /> {Number(r.rating_avg).toFixed(1)} · </> : null}
                      {r.completed_trips} trips · {r.community_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label={`Call ${r.display_name}`}><a href={`tel:${r.phone.replace(/\s/g, "")}`}><Phone aria-hidden /></a></Button>
                    <Button asChild variant="ghost" size="icon" aria-label={`WhatsApp ${r.display_name}`}><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /></a></Button>
                    <Button asChild size="sm" className="rounded-full"><Link href={`/rides?rider=${r.user_id}&kind=${r.offers_rides ? "ride" : "delivery"}`}>Request</Link></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Link href="/rider" className="pressable flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-green-soft text-brand-green-soft-foreground"><Bike aria-hidden className="size-6" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Ride or drive with BridgeConnect</span>
          <span className="block text-sm text-muted-foreground">Own an okada, tricycle or car? Register, get verified and earn on your own schedule.</span>
        </span>
        <ArrowRight aria-hidden className="size-5 text-muted-foreground" />
      </Link>
    </div>
  );
}
