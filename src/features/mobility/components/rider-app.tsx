"use client";

import { Banknote, Clock, Loader2, MapPin, Navigation, Package, Power, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { VEHICLE_LABEL, VEHICLES, type Vehicle } from "@/lib/fares";
import { formatMoney, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { acceptTripAction, saveRiderProfileAction, setOnlineAction, updateTripStatusAction } from "../actions";
import { riderProfileSchema } from "../schemas";

export function RiderProfileForm({
  communities,
  initial,
}: {
  communities: CommunityChoice[];
  initial?: {
    vehicleType: Vehicle; vehicleDescription: string; plateNumber: string; offersRides: boolean; offersDelivery: boolean;
    communityId: string; serviceArea: string; phone: string; whatsapp: string; bio: string;
  };
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(riderProfileSchema, saveRiderProfileAction, {
    defaultValues: initial ?? { vehicleType: "motorbike", vehicleDescription: "", plateNumber: "", offersRides: true, offersDelivery: true, communityId: "", serviceArea: "", phone: "", whatsapp: "", bio: "" },
    onSuccess: () => router.refresh(),
  });
  const reg = (name: Parameters<typeof form.register>[0]) => ({ ...controlProps(name, errorFor(name)), ...form.register(name) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vehicleType" label="Vehicle" required error={errorFor("vehicleType")}>
          <NativeSelect {...reg("vehicleType")}>
            {VEHICLES.map((v) => <option key={v} value={v}>{VEHICLE_LABEL[v].name} ({VEHICLE_LABEL[v].local})</option>)}
          </NativeSelect>
        </Field>
        <Field id="plateNumber" label="Number plate" error={errorFor("plateNumber")}>
          <Input maxLength={20} placeholder="e.g. M-24-CR 1234" {...reg("plateNumber")} />
        </Field>
      </div>
      <Field id="vehicleDescription" label="Vehicle description" required error={errorFor("vehicleDescription")}>
        <Input maxLength={120} placeholder="e.g. Red Honda 125 motorbike" {...reg("vehicleDescription")} />
      </Field>
      <div className="flex flex-wrap gap-4">
        <Label className="font-normal"><Checkbox defaultChecked={initial?.offersRides ?? true} onCheckedChange={(v) => form.setValue("offersRides", v === true)} /> I take passengers</Label>
        <Label className="font-normal"><Checkbox defaultChecked={initial?.offersDelivery ?? true} onCheckedChange={(v) => form.setValue("offersDelivery", v === true)} /> I do deliveries</Label>
      </div>
      {errorFor("offersRides") ? <p role="alert" className="text-xs text-destructive">{errorFor("offersRides")}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="communityId" label="Base community" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} {...reg("communityId")} />
        </Field>
        <Field id="serviceArea" label="Areas you cover" error={errorFor("serviceArea")}>
          <Input maxLength={200} placeholder="e.g. Kwamankese, Abakrampa, Cape Coast" {...reg("serviceArea")} />
        </Field>
        <Field id="phone" label="Phone" required error={errorFor("phone")}>
          <Input type="tel" autoComplete="tel" {...reg("phone")} />
        </Field>
        <Field id="whatsapp" label="WhatsApp" error={errorFor("whatsapp")}>
          <Input type="tel" {...reg("whatsapp")} />
        </Field>
      </div>
      <Field id="bio" label="About you" error={errorFor("bio")}>
        <Textarea rows={2} maxLength={300} placeholder="Years of experience, languages, anything customers should know" {...reg("bio")} />
      </Field>
      <p className="text-xs text-muted-foreground">
        By registering you confirm you hold a valid licence and the insurance required by law. DBI staff verify every rider before they can accept jobs.
      </p>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>{pending ? "Saving…" : initial ? "Save profile" : "Apply to ride"}</Button>
    </form>
  );
}

/** Big go-online switch. Sends an approximate position (3 decimals ≈ 100 m) to sort nearby jobs. */
export function OnlineSwitch({ online }: { online: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function toggle() {
    const go = (lat?: number, lng?: number) =>
      startTransition(async () => {
        const r = await setOnlineAction(!online, lat, lng);
        if (r.ok) toast.success(r.message ?? "");
        else toast.error(r.error);
        router.refresh();
      });
    if (!online && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((p) => go(p.coords.latitude, p.coords.longitude), () => go(), { timeout: 8000 });
    } else go();
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={online}
      onClick={toggle}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-4 rounded-3xl p-5 text-left text-white shadow-lg transition-all active:scale-[0.99]",
        online ? "bg-gradient-to-br from-brand-green to-brand-navy" : "bg-gradient-to-br from-muted-foreground to-foreground/80",
      )}
    >
      <span className={cn("flex size-16 shrink-0 items-center justify-center rounded-full bg-white/20", online && "animate-online")}>
        {pending ? <Loader2 aria-hidden className="size-8 animate-spin" /> : <Power aria-hidden className="size-8" />}
      </span>
      <span>
        <span className="block text-xl font-extrabold">{online ? "You're online" : "You're offline"}</span>
        <span className="block text-sm opacity-90">{online ? "Tap to go offline. New jobs appear below." : "Tap to go online and start receiving jobs."}</span>
      </span>
    </button>
  );
}

/** Keeps the job list fresh (new requests also arrive as notifications, which refresh the page). */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(t);
  }, [router, seconds]);
  return null;
}

export type OpenRequest = {
  id: string;
  trip_number: number;
  kind: "ride" | "delivery";
  vehicle_type: Vehicle | null;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  package_description: string | null;
  note: string | null;
  payment_method: "cash" | "mobile_money";
  offered_fare: number;
  created_at: string;
  for_me: boolean;
  pickup_km: number | null;
};

export function OpenRequestCard({ request, canAccept }: { request: OpenRequest; canAccept: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <article className="animate-page space-y-3 rounded-2xl border bg-card p-4 shadow-xs" aria-label={`Request ${request.trip_number}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-10 items-center justify-center rounded-xl", request.kind === "ride" ? "bg-primary-soft text-primary-soft-foreground" : "bg-warning-soft text-warning-soft-foreground")}>
            {request.kind === "ride" ? <UserRound aria-hidden className="size-5" /> : <Package aria-hidden className="size-5" />}
          </span>
          <div>
            <p className="font-semibold">{request.kind === "ride" ? "Ride" : "Delivery"} · #{request.trip_number}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock aria-hidden className="size-3" /> {formatRelative(request.created_at)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-brand-green">{formatMoney(request.offered_fare, "GHS")}</p>
          <p className="text-xs text-muted-foreground">{request.payment_method === "cash" ? "Cash" : "Mobile money"}</p>
        </div>
      </div>
      {request.for_me ? <p className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-soft-foreground">The customer chose you</p> : null}
      <div className="space-y-1.5 text-sm">
        <p className="flex items-start gap-2"><span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-green" /> {request.pickup_address}{request.pickup_km != null ? <span className="text-xs text-muted-foreground"> · {request.pickup_km} km away</span> : null}</p>
        <p className="flex items-start gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" /> {request.dropoff_address}</p>
      </div>
      {request.package_description ? <p className="text-sm"><span className="font-medium">Package:</span> {request.package_description}</p> : null}
      {request.note ? <p className="rounded-lg bg-muted p-2 text-sm">{request.note}</p> : null}
      <Button
        className="w-full rounded-full"
        size="lg"
        disabled={!canAccept || pending}
        onClick={() =>
          startTransition(async () => {
            const r = await acceptTripAction(request.id);
            if (r.ok) {
              if ("vibrate" in navigator) navigator.vibrate?.(40);
              toast.success(r.message ?? "Accepted");
            } else toast.error(r.error);
            router.refresh();
          })
        }
      >
        {pending ? "Accepting…" : canAccept ? "Accept job" : "Finish your current job first"}
      </Button>
    </article>
  );
}

export function ActiveTripControls({
  tripId,
  status,
  offeredFare,
  pickupAddress,
  dropoffAddress,
}: {
  tripId: string;
  status: "accepted" | "arrived" | "in_progress";
  offeredFare: number;
  pickupAddress: string;
  dropoffAddress: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fare, setFare] = useState(String(offeredFare));
  const run = (s: "arrived" | "in_progress" | "completed" | "requested", extra?: { finalFare?: number }) =>
    startTransition(async () => {
      const r = await updateTripStatusAction(tripId, s, extra);
      if (r.ok) toast.success(r.message ?? "Updated");
      else toast.error(r.error);
      router.refresh();
    });
  const navTo = status === "in_progress" ? dropoffAddress : pickupAddress;
  return (
    <div className="space-y-3">
      <Button asChild variant="outline" className="w-full rounded-full">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navTo + ", Ghana")}`} target="_blank" rel="noopener noreferrer">
          <Navigation aria-hidden /> Navigate to {status === "in_progress" ? "drop-off" : "pickup"}
        </a>
      </Button>
      {status === "accepted" ? (
        <Button size="lg" className="w-full rounded-full" disabled={pending} onClick={() => run("arrived")}>I&apos;ve arrived at pickup</Button>
      ) : null}
      {status === "arrived" ? (
        <Button size="lg" className="w-full rounded-full" disabled={pending} onClick={() => run("in_progress")}>Start trip</Button>
      ) : null}
      {status === "in_progress" ? (
        <div className="space-y-2">
          <label htmlFor="final-fare" className="flex items-center gap-1 text-sm font-medium"><Banknote aria-hidden className="size-4" /> Fare collected (GHS)</label>
          <Input id="final-fare" type="number" inputMode="decimal" min="1" step="0.5" value={fare} onChange={(e) => setFare(e.target.value)} />
          <Button size="lg" variant="green" className="w-full rounded-full" disabled={pending || !(Number(fare) > 0)} onClick={() => run("completed", { finalFare: Number(fare) })}>
            Complete trip
          </Button>
        </div>
      ) : null}
      {status !== "in_progress" ? (
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive" disabled={pending}
          onClick={() => { if (window.confirm("Release this job to other riders?")) run("requested"); }}>
          I can&apos;t make it — release job
        </Button>
      ) : null}
    </div>
  );
}
