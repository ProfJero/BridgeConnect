"use client";

import { Check, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import { setRsvpAction } from "../actions";

export function RsvpButtons({ eventId, slug, current }: { eventId: string; slug: string; current: "going" | "interested" | null }) {
  const { pending, run } = useServerAction();
  const set = (status: "going" | "interested" | null) => run(() => setRsvpAction({ eventId, slug, status }));
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={current === "going" ? "green" : "default"} disabled={pending} aria-pressed={current === "going"} onClick={() => set(current === "going" ? null : "going")}>
        <Check aria-hidden /> {current === "going" ? "Going" : "I'm going"}
      </Button>
      <Button variant="outline" disabled={pending} aria-pressed={current === "interested"} onClick={() => set(current === "interested" ? null : "interested")}>
        <Star aria-hidden className={current === "interested" ? "fill-warning text-warning" : undefined} /> Interested
      </Button>
    </div>
  );
}
