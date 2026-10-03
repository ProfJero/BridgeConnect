import { Megaphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { publicMediaUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/** Server-rendered, clearly-labelled sponsored slot (approved ads only). */
export async function AdSlot({
  placement,
  communityId,
}: {
  placement: Database["public"]["Enums"]["ad_placement"];
  communityId?: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("active_advertisements", {
    p_placement: placement,
    p_community: communityId,
    p_limit: 1,
  });
  const ad = data?.[0];
  if (!ad) return null;
  const image = publicMediaUrl(ad.image_path);
  const content = (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      {image ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Image src={image} alt="" fill sizes="64px" className="object-cover" />
        </div>
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-green-soft text-brand-green-soft-foreground">
          <Megaphone aria-hidden className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Sponsored</p>
        <p className="font-semibold">{ad.title}</p>
        {ad.body ? <p className="line-clamp-2 text-sm text-muted-foreground">{ad.body}</p> : null}
      </div>
    </div>
  );
  return (
    <aside aria-label="Sponsored">
      {ad.link_path ? (
        <Link href={`/go/ad/${ad.id}`} prefetch={false} className="block hover:shadow-md">
          {content}
        </Link>
      ) : (
        content
      )}
    </aside>
  );
}
