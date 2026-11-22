import { Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EntityAvatar } from "@/components/shared/avatars";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { openState, type OpeningHours } from "@/lib/opening-hours";
import { publicMediaUrl } from "@/lib/storage";
import type { Database } from "@/types/database";

export type BusinessTileData = {
  id: string;
  name: string;
  slug: string;
  entity_type: Database["public"]["Enums"]["entity_type"];
  logo_path: string | null;
  cover_path: string | null;
  rating_avg: number | null;
  rating_count: number;
  opening_hours: unknown;
  communities: { name: string } | null;
};

/** Vertical card for horizontal rails: cover, logo, name, type, rating, open/closed. */
export function BusinessTile({ entity }: { entity: BusinessTileData }) {
  const cover = publicMediaUrl(entity.cover_path, 640);
  const state = openState(entity.opening_hours as OpeningHours | null);
  return (
    <article className="group pressable relative w-44 shrink-0 snap-start overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-tint shadow-xs transition-shadow focus-within:ring-[3px] focus-within:ring-ring/40 hover:shadow-md sm:w-52">
      <div className="relative h-24 bg-gradient-to-br from-hero-2 to-hero-3">
        {cover ? <Image src={cover} alt="" fill sizes="208px" className="object-cover" /> : (
          <Store aria-hidden className="absolute right-3 bottom-2 size-10 text-white/25" />
        )}
      </div>
      <div className="space-y-1 p-3 pt-0">
        <EntityAvatar name={entity.name} path={entity.logo_path} className="-mt-6 size-12 rounded-xl border-2 border-card bg-card" />
        <h3 className="flex items-center gap-1 truncate text-sm font-semibold">
          <Link href={`/directory/${entity.slug}`} className="truncate after:absolute after:inset-0 focus-visible:outline-none">
            {entity.name}
          </Link>
          <VerifiedBadge compact />
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {ENTITY_TYPE_LABEL[entity.entity_type]}{entity.communities?.name ? ` · ${entity.communities.name}` : ""}
        </p>
        <div className="flex items-center justify-between gap-2">
          {entity.rating_count ? <RatingStars value={entity.rating_avg} count={entity.rating_count} /> : <span className="text-xs text-muted-foreground">New</span>}
          {state ? (
            <span className={state === "open" ? "text-xs font-semibold text-price" : "text-xs font-medium text-muted-foreground"}>
              {state === "open" ? "Open" : "Closed"}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
