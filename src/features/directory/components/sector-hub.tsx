import Link from "next/link";

import { EntityCard } from "@/components/cards/entity-card";
import { EventCard, ServiceCard } from "@/components/cards/listing-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { listEvents } from "@/features/events/queries";
import { getCommunityOptions } from "@/features/locations/queries";
import { listServices } from "@/features/marketplace/queries";

import { SECTOR_HUBS, type SectorHubKey } from "../constants";
import { listEntities } from "../queries";

export async function SectorHub({ hub, communityId }: { hub: SectorHubKey; communityId?: string }) {
  const config = SECTOR_HUBS[hub];
  const [entities, services, events, communities] = await Promise.all([
    listEntities({ sector: config.sector, types: config.entityTypes, communityId, pageSize: 9 }),
    listServices({ sector: config.sector, communityId, pageSize: 6 }),
    listEvents({ sector: config.sector, communityId, pageSize: 4 }),
    getCommunityOptions(),
  ]);
  const empty = entities.total + services.total + events.total === 0;
  return (
    <div className="space-y-6">
      <PageHeader title={config.title} description={config.description} actions={<CommunityFilter options={communities} value={communityId} />} />
      {empty ? (
        <EmptyState title={`No ${config.title.toLowerCase()} listings yet`} description="Verified organisations in this sector will appear here." />
      ) : null}
      {entities.items.length ? (
        <Section title="Organisations">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entities.items.map((e) => <EntityCard key={e.id} entity={e} />)}
          </div>
        </Section>
      ) : null}
      {services.items.length ? (
        <Section title="Services" action={<Link href="/services" className="text-sm font-medium text-primary hover:underline">All services</Link>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.items.map((s) => <ServiceCard key={s.id} service={s} />)}
          </div>
        </Section>
      ) : null}
      {events.items.length ? (
        <Section title="Upcoming events">
          <div className="grid gap-3 sm:grid-cols-2">
            {events.items.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
