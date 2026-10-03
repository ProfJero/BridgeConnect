import type { Metadata } from "next";
import Link from "next/link";

import { EntityCard } from "@/components/cards/entity-card";
import { ServiceCard } from "@/components/cards/listing-cards";
import { DIRECTORY_NAV } from "@/components/layout/nav-config";
import { PageHeader, Section } from "@/components/shared/page-header";
import { SearchForm } from "@/components/widgets/search-form";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { listEntities } from "@/features/directory/queries";
import { listServices } from "@/features/marketplace/queries";
import { getViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const viewer = await getViewer();
  const communityId = viewer?.profile.home_community_id ?? undefined;
  const [entities, services] = await Promise.all([
    listEntities({ communityId, pageSize: 6 }),
    listServices({ pageSize: 4 }),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Explore" description="Everything your community offers, in one place." />
      <SearchForm action="/search" placeholder="Search everything on BridgeConnect" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTORY_NAV.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md">
              <span className={href === "/emergency" ? "flex size-11 items-center justify-center rounded-xl bg-destructive-soft text-destructive" : "flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"}>
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <AdSlot placement="explore" communityId={communityId} />
      {entities.items.length ? (
        <Section title={communityId ? "Verified near you" : "Verified organisations"} action={<Link href="/businesses" className="text-sm font-medium text-primary hover:underline">Directory</Link>}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entities.items.map((e) => <EntityCard key={e.id} entity={e} />)}</div>
        </Section>
      ) : null}
      {services.items.length ? (
        <Section title="Popular services" action={<Link href="/services" className="text-sm font-medium text-primary hover:underline">All services</Link>}>
          <div className="grid gap-3 sm:grid-cols-2">{services.items.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        </Section>
      ) : null}
    </div>
  );
}
