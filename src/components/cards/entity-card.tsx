import { MapPin } from "lucide-react";
import Link from "next/link";

import { EntityAvatar } from "@/components/shared/avatars";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { Badge } from "@/components/ui/badge";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import type { EntityCardData } from "@/features/directory/queries";

export function EntityCard({ entity }: { entity: EntityCardData }) {
  return (
    <Link
      href={`/directory/${entity.slug}`}
      className="group flex gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <EntityAvatar name={entity.name} path={entity.logo_path} className="size-12" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold group-hover:text-primary">{entity.name}</h3>
          <VerifiedBadge compact />
        </div>
        {entity.tagline ? <p className="line-clamp-2 text-sm text-muted-foreground">{entity.tagline}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
          <Badge variant="soft">{ENTITY_TYPE_LABEL[entity.entity_type]}</Badge>
          {entity.communities?.name ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden className="size-3" />
              {entity.communities.name}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
