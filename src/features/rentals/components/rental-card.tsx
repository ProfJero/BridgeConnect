import { Bath, BedDouble, House, MapPin, Sofa } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatMoney } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { publicMediaUrl } from "@/lib/storage";

import type { RentalCardData } from "../queries";
import { PERIOD_SHORT, RENTAL_TYPE_LABEL } from "../schemas";

export function RentalCard({ rental }: { rental: RentalCardData }) {
  const image = orderedMedia(rental.rental_media)[0];
  return (
    <article className="group pressable relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow focus-within:ring-[3px] focus-within:ring-ring/40 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {image ? (
          <Image src={publicMediaUrl(image.path, 640)!} alt={image.alt || rental.title} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-warning-soft to-primary-soft text-warning-soft-foreground">
            <House aria-hidden className="size-10" />
          </div>
        )}
        <span className="absolute top-2 left-2 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold shadow-sm">
          {RENTAL_TYPE_LABEL[rental.rental_type]}
        </span>
        {rental.status !== "available" ? <span className="absolute top-2 right-2"><StatusBadge status={rental.status} /></span> : null}
      </div>
      <div className="space-y-1 p-3.5">
        <p className="text-lg font-extrabold text-brand-green">
          {formatMoney(rental.price, rental.currency)}
          <span className="text-sm font-medium text-muted-foreground">{PERIOD_SHORT[rental.period]}</span>
        </p>
        <h3 className="line-clamp-1 font-semibold">
          <Link href={`/rentals/${rental.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">{rental.title}</Link>
        </h3>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          {[rental.location_note, rental.communities?.name].filter(Boolean).join(", ")}
        </p>
        <p className="flex flex-wrap gap-x-3 pt-1 text-xs text-muted-foreground">
          {rental.bedrooms != null ? <span className="inline-flex items-center gap-1"><BedDouble aria-hidden className="size-3.5" /> {rental.bedrooms} bed</span> : null}
          {rental.bathrooms != null ? <span className="inline-flex items-center gap-1"><Bath aria-hidden className="size-3.5" /> {rental.bathrooms} bath</span> : null}
          {rental.furnished ? <span className="inline-flex items-center gap-1"><Sofa aria-hidden className="size-3.5" /> Furnished</span> : null}
        </p>
      </div>
    </article>
  );
}
