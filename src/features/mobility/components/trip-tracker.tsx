"use client";

import { Check, MapPin, MessageCircle, Phone, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { rateTripAction, updateTripStatusAction } from "../actions";
import type { TripStatus } from "../schemas";

const STEPS: { status: TripStatus; label: string }[] = [
  { status: "requested", label: "Finding a rider" },
  { status: "accepted", label: "Rider on the way" },
  { status: "arrived", label: "Rider has arrived" },
  { status: "in_progress", label: "On the move" },
  { status: "completed", label: "Completed" },
];

/** Live trip progress for the customer. Updates arrive through Realtime (RLS-filtered). */
export function TripTracker({ tripId, status, kind }: { tripId: string; status: TripStatus; kind: "ride" | "delivery" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, () => {
        if ("vibrate" in navigator) navigator.vibrate?.([30, 40, 30]);
        router.refresh();
      })
      .subscribe();
    // Fallback refresh in case a realtime connection drops on a weak network.
    const t = window.setInterval(() => router.refresh(), 20_000);
    return () => {
      window.clearInterval(t);
      void supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  const current = STEPS.findIndex((s) => s.status === status);
  if (status === "cancelled") {
    return <p className="rounded-2xl bg-muted p-4 text-center text-sm font-medium">This {kind} was cancelled.</p>;
  }
  return (
    <div className="space-y-4">
      <ol className="space-y-0" aria-label="Trip progress">
        {STEPS.map((s, i) => {
          const done = i < current || status === "completed";
          const active = i === current && status !== "completed";
          return (
            <li key={s.status} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    done && "border-brand-green bg-brand-green text-brand-green-foreground",
                    active && "animate-online border-primary bg-primary text-primary-foreground",
                    !done && !active && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check aria-hidden className="size-4" /> : i + 1}
                </span>
                {i < STEPS.length - 1 ? <span className={cn("h-7 w-0.5", done ? "bg-brand-green" : "bg-border")} /> : null}
              </div>
              <p className={cn("pt-1 text-sm", active ? "font-bold" : done ? "font-medium" : "text-muted-foreground")}>
                {s.label}
                {active ? <span className="sr-only"> (current step)</span> : null}
              </p>
            </li>
          );
        })}
      </ol>
      {["requested", "accepted", "arrived"].includes(status) ? (
        <Button
          variant="outline"
          className="w-full rounded-full text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Cancel this ${kind}?`)) return;
            startTransition(async () => {
              const r = await updateTripStatusAction(tripId, "cancelled");
              if (r.ok) toast.success(r.message ?? "Cancelled.");
              else toast.error(r.error);
              router.refresh();
            });
          }}
        >
          <X aria-hidden /> Cancel request
        </Button>
      ) : null}
    </div>
  );
}

export function RiderContact({ name, phone, whatsapp }: { name: string; phone: string; whatsapp: string | null }) {
  const digits = (whatsapp ?? phone).replace(/[^0-9]/g, "").replace(/^0/, "233");
  return (
    <div className="flex gap-2">
      <Button asChild variant="green" className="flex-1 rounded-full"><a href={`tel:${phone.replace(/\s/g, "")}`}><Phone aria-hidden /> Call {name.split(" ")[0]}</a></Button>
      <Button asChild variant="outline" className="flex-1 rounded-full"><a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button>
    </div>
  );
}

export function RateTrip({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="font-semibold">How was your trip?</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setRating(i)} className="p-1 transition active:scale-90">
            <Star aria-hidden className={cn("size-8", i <= rating ? "fill-warning text-warning" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <label htmlFor="trip-comment" className="sr-only">Comment</label>
      <Textarea id="trip-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything to add? (optional)" />
      <Button
        className="w-full rounded-full"
        disabled={!rating || pending}
        onClick={() =>
          startTransition(async () => {
            const r = await rateTripAction(tripId, rating, comment);
            if (r.ok) toast.success(r.message ?? "Thanks!");
            else toast.error(r.error);
            router.refresh();
          })
        }
      >
        Submit rating
      </Button>
    </div>
  );
}

export function PlaceLine({ from, to }: { from: string; to: string }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="flex items-start gap-2"><span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand-green" /> {from}</p>
      <p className="flex items-start gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" /> {to}</p>
    </div>
  );
}
