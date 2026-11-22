"use client";

import { Bike, Car, Crosshair, Loader2, Minus, Package, Plus, Truck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { suggestFare, VEHICLE_LABEL, type Vehicle } from "@/lib/fares";
import { cn } from "@/lib/utils";

import { requestTripAction } from "../actions";
import { tripRequestSchema } from "../schemas";

const VEHICLE_ICON: Record<Vehicle, typeof Bike> = { motorbike: Bike, tricycle: Truck, car: Car, van: Truck, bicycle: Bike };
const CHOICES: Vehicle[] = ["motorbike", "tricycle", "car", "van"];

export function TripRequestForm({
  communities,
  defaultCommunityId,
  defaultKind = "ride",
  preferredRider,
  orderId,
  defaults,
}: {
  communities: CommunityChoice[];
  defaultCommunityId?: string;
  defaultKind?: "ride" | "delivery";
  preferredRider?: { id: string; name: string; vehicle: Vehicle } | null;
  orderId?: string;
  defaults?: { pickupAddress?: string; dropoffAddress?: string; packageDescription?: string; phone?: string };
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"ride" | "delivery">(orderId ? "delivery" : defaultKind);
  const [vehicle, setVehicle] = useState<Vehicle>(preferredRider?.vehicle ?? (defaultKind === "delivery" ? "motorbike" : "motorbike"));
  const [locating, setLocating] = useState(false);
  const [fare, setFare] = useState(() => suggestFare(preferredRider?.vehicle ?? "motorbike"));
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(tripRequestSchema, requestTripAction, {
    defaultValues: {
      kind,
      vehicleType: vehicle,
      communityId: defaultCommunityId ?? "",
      pickupAddress: defaults?.pickupAddress ?? "",
      dropoffAddress: defaults?.dropoffAddress ?? "",
      packageDescription: defaults?.packageDescription ?? "",
      recipientName: "",
      recipientPhone: "",
      customerPhone: defaults?.phone ?? "",
      note: "",
      paymentMethod: "cash",
      offeredFare: fare,
      preferredRiderId: preferredRider?.id ?? "",
      orderId: orderId ?? "",
    },
    onSuccess: ({ data }) => router.push(data ? `/rides/${data.id}` : "/rides/history"),
  });
  const payment = form.watch("paymentMethod");

  function chooseVehicle(v: Vehicle) {
    setVehicle(v);
    setFare(suggestFare(v));
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) };
        form.setValue("pickupLat", p.lat);
        form.setValue("pickupLng", p.lng);
        if (!form.getValues("pickupAddress")) form.setValue("pickupAddress", "My current location (GPS)");
        setLocating(false);
        toast.success("Pickup location set from GPS.");
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Type a landmark instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    form.setValue("kind", kind);
    form.setValue("vehicleType", preferredRider ? "" : vehicle);
    form.setValue("offeredFare", fare);
    void onSubmit(e);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <FormError message={formError} />
      {!orderId ? (
        <div role="radiogroup" aria-label="What do you need?" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
          {([["ride", "Ride", UserRound], ["delivery", "Delivery", Package]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-muted-foreground transition-all", kind === k && "bg-card text-foreground shadow-sm")}
            >
              <Icon aria-hidden className="size-4" /> {label}
            </button>
          ))}
        </div>
      ) : null}

      {preferredRider ? (
        <p className="rounded-xl bg-primary-soft p-3 text-sm text-primary-soft-foreground">
          Requesting <strong>{preferredRider.name}</strong> ({VEHICLE_LABEL[preferredRider.vehicle].local}). Only they will see this request.
        </p>
      ) : (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Choose a vehicle</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHOICES.map((v) => {
              const Icon = VEHICLE_ICON[v];
              const on = vehicle === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => chooseVehicle(v)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border bg-card p-3 text-left transition-all active:scale-[0.97]",
                    on ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50",
                  )}
                >
                  <Icon aria-hidden className={cn("size-6", on ? "text-link" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold">{VEHICLE_LABEL[v].local}</span>
                  <span className="text-[11px] leading-tight text-muted-foreground">{VEHICLE_LABEL[v].seats}</span>
                  <span className="text-xs font-bold text-price">from GH₵{suggestFare(v)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid gap-3 rounded-2xl border bg-card p-4">
        <Field id="pickupAddress" label={<span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-brand-green" /> Pickup</span>} required error={errorFor("pickupAddress")}>
          <div className="flex gap-2">
            <Input maxLength={300} placeholder="Landmark, street or house" {...controlProps("pickupAddress", errorFor("pickupAddress"))} {...form.register("pickupAddress")} />
            <Button type="button" variant="outline" size="icon" onClick={useMyLocation} disabled={locating} aria-label="Use my current location">
              {locating ? <Loader2 aria-hidden className="animate-spin" /> : <Crosshair aria-hidden />}
            </Button>
          </div>
        </Field>
        <Field id="dropoffAddress" label={<span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-destructive" /> {kind === "delivery" ? "Deliver to" : "Destination"}</span>} required error={errorFor("dropoffAddress")}>
          <Input maxLength={300} placeholder="Where to?" {...controlProps("dropoffAddress", errorFor("dropoffAddress"))} {...form.register("dropoffAddress")} />
        </Field>
        <Field id="communityId" label="Community (pickup area)" required error={errorFor("communityId")}>
          <CommunitySelect options={communities} {...controlProps("communityId", errorFor("communityId"))} {...form.register("communityId")} />
        </Field>
      </div>

      {kind === "delivery" ? (
        <div className="grid gap-3 rounded-2xl border bg-card p-4">
          <Field id="packageDescription" label="What are we delivering?" required error={errorFor("packageDescription")}>
            <Input maxLength={500} placeholder="e.g. 2 bags of rice, a phone, documents" {...controlProps("packageDescription", errorFor("packageDescription"))} {...form.register("packageDescription")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="recipientName" label="Recipient name" error={errorFor("recipientName")}>
              <Input maxLength={80} {...controlProps("recipientName", errorFor("recipientName"))} {...form.register("recipientName")} />
            </Field>
            <Field id="recipientPhone" label="Recipient phone" error={errorFor("recipientPhone")}>
              <Input type="tel" {...controlProps("recipientPhone", errorFor("recipientPhone"))} {...form.register("recipientPhone")} />
            </Field>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="customerPhone" label="Your phone" required error={errorFor("customerPhone")} hint="Shared with your rider once they accept.">
          <Input type="tel" autoComplete="tel" placeholder="+233 24 123 4567" {...controlProps("customerPhone", errorFor("customerPhone"), true)} {...form.register("customerPhone")} />
        </Field>
        <div className="grid gap-2">
          <span className="text-sm font-medium">Payment</span>
          <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {([["cash", "Cash"], ["mobile_money", "Mobile money"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={payment === m} onClick={() => form.setValue("paymentMethod", m)}
                className={cn("rounded-lg py-2 text-sm font-medium text-muted-foreground transition", payment === m && "bg-card text-foreground shadow-xs")}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Field id="note" label="Note for the rider" error={errorFor("note")}>
        <Textarea rows={2} maxLength={500} placeholder="e.g. I'm at the blue gate" {...controlProps("note", errorFor("note"))} {...form.register("note")} />
      </Field>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center gap-3 border-t bg-card/95 p-4 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" className="rounded-full" aria-label="Lower fare" onClick={() => setFare((f) => Math.max(1, f - 1))}><Minus aria-hidden /></Button>
          <div className="min-w-20 text-center">
            <p className="text-[11px] text-muted-foreground">Your offer</p>
            <p className="text-lg font-extrabold tabular-nums" aria-live="polite">GH₵{fare}</p>
          </div>
          <Button type="button" variant="outline" size="icon-sm" className="rounded-full" aria-label="Raise fare" onClick={() => setFare((f) => Math.min(10_000, f + 1))}><Plus aria-hidden /></Button>
        </div>
        <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={pending}>
          {pending ? "Finding riders…" : kind === "delivery" ? "Request delivery" : "Request ride"}
        </Button>
      </div>
      {errorFor("offeredFare") ? <p role="alert" className="text-xs text-destructive">{errorFor("offeredFare")}</p> : null}
    </form>
  );
}
