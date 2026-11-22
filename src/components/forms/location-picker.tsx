"use client";

import { Crosshair, Loader2, MapPin, Navigation, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { directionsUrl, parseCoordinates } from "@/lib/contact";

/**
 * Lets an owner pin their exact location so customers get turn-by-turn
 * directions: use the device's GPS, or paste a Google Maps link / "lat, lng".
 */
export function LocationPicker({
  value,
  onChange,
  label = "Map location",
}: {
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number } | null) => void;
  label?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [pasted, setPasted] = useState("");

  function useGps() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange({ lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5)) });
        toast.success("Location pinned. Stand at the entrance for the best accuracy.");
      },
      () => {
        setLocating(false);
        toast.error("We couldn't get your location. Paste a Google Maps link instead.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <fieldset className="grid gap-2 rounded-2xl border bg-gradient-to-br from-card to-tint p-3">
      <legend className="px-1 text-sm font-medium">{label} <span className="text-xs font-normal text-muted-foreground">(optional, powers “Directions”)</span></legend>
      {value ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-3 py-1 font-medium text-brand-green-soft-foreground">
            <MapPin aria-hidden className="size-4" /> {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
          <a href={directionsUrl(value)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
            <Navigation aria-hidden className="size-4" /> Check on map
          </a>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X aria-hidden /> Remove pin</Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={useGps} disabled={locating} className="shrink-0">
          {locating ? <Loader2 aria-hidden className="animate-spin" /> : <Crosshair aria-hidden />} Use my current location
        </Button>
        <div className="flex flex-1 gap-2">
          <label className="sr-only" htmlFor="location-paste">Paste a Google Maps link or coordinates</label>
          <Input id="location-paste" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="…or paste a Google Maps link / 5.2, -1.2" />
          <Button
            type="button"
            variant="soft"
            onClick={() => {
              const c = parseCoordinates(pasted);
              if (c) {
                onChange(c);
                setPasted("");
              } else toast.error("That link doesn't contain coordinates. In Google Maps, drop a pin and copy its link.");
            }}
          >
            Set
          </Button>
        </div>
      </div>
    </fieldset>
  );
}
