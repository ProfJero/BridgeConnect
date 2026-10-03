import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { listMyFavourites } from "@/features/favourites/queries";
import { requireViewer } from "@/lib/auth/session";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Favourites" };

export default async function FavouritesPage() {
  await requireViewer("/favourites");
  const favourites = await listMyFavourites();
  // Items that are no longer public are filtered out by RLS (join returns null).
  const rows = favourites.flatMap((f) => {
    if (f.entities) return [{ id: f.id, href: `/directory/${f.entities.slug}`, title: f.entities.name, kind: ENTITY_TYPE_LABEL[f.entities.entity_type], meta: f.entities.tagline }];
    if (f.products) return [{ id: f.id, href: `/marketplace/${f.products.slug}`, title: f.products.name, kind: "Product", meta: formatMoney(f.products.price, f.products.currency) }];
    if (f.services) return [{ id: f.id, href: `/services/${f.services.slug}`, title: f.services.name, kind: "Service", meta: null }];
    if (f.jobs) return [{ id: f.id, href: `/jobs/${f.jobs.slug}`, title: f.jobs.title, kind: "Job", meta: f.jobs.status === "open" ? "Open" : "Closed" }];
    if (f.events) return [{ id: f.id, href: `/events/${f.events.slug}`, title: f.events.title, kind: "Event", meta: formatDateTime(f.events.starts_at) }];
    return [];
  });
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Favourites" description="Businesses, products, jobs and events you've saved." />
      {rows.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Tap Save on anything you'd like to come back to." action={<Button asChild><Link href="/explore">Explore</Link></Button>} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.title}</span>
                  {r.meta ? <span className="block truncate text-sm text-muted-foreground">{r.meta}</span> : null}
                </span>
                <Badge variant="soft">{r.kind}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
