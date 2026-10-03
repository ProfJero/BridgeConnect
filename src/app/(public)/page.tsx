import { ArrowRight, MapPin, PlusCircle, Siren } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/cards/product-card";
import { EventCard, JobCard } from "@/components/cards/listing-cards";
import { DIRECTORY_NAV } from "@/components/layout/nav-config";
import { EmptyState } from "@/components/shared/empty-state";
import { Section } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/status-badge";
import { SearchForm } from "@/components/widgets/search-form";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/community/components/post-card";
import { getMyReactions, listFeed } from "@/features/community/queries";
import { getActiveAlerts, getAlertsForCommunity } from "@/features/emergency/queries";
import { listEvents } from "@/features/events/queries";
import { listJobs } from "@/features/jobs/queries";
import { getCommunityName } from "@/features/locations/queries";
import { listProducts } from "@/features/marketplace/queries";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { getViewer } from "@/lib/auth/session";

export default async function HomePage() {
  const viewer = await getViewer();
  const communityId = viewer?.profile.home_community_id ?? undefined;
  const [community, feed, products, events, jobs, alerts] = await Promise.all([
    getCommunityName(communityId),
    listFeed({ communityId, pageSize: 3 }),
    listProducts({ communityId, pageSize: 4 }),
    listEvents({ pageSize: 3 }),
    listJobs({ pageSize: 3 }),
    communityId ? getAlertsForCommunity(communityId) : getActiveAlerts(3),
  ]);
  const reactions = await getMyReactions(feed.items.map((p) => p.id), viewer?.id);
  const firstName = viewer?.profile.display_name.split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-primary px-5 py-6 text-primary-foreground sm:px-8 sm:py-10">
        <p className="text-sm font-medium opacity-90">
          {firstName ? `Good to see you, ${firstName}` : "Welcome to BridgeConnect"}
        </p>
        <h1 className="mt-1 max-w-xl text-2xl font-bold tracking-tight text-balance sm:text-4xl">
          Connecting Communities. Empowering Lives.
        </h1>
        {community ? (
          <p className="mt-2 inline-flex items-center gap-1 text-sm opacity-90">
            <MapPin aria-hidden className="size-4" /> {community.name}, {community.districtName}
          </p>
        ) : (
          <p className="mt-2 max-w-lg text-sm opacity-90">
            Find trusted businesses, services, jobs, events and emergency information near you.
          </p>
        )}
        <div className="mt-5 flex max-w-xl gap-2 rounded-xl bg-card p-1.5 text-foreground">
          <SearchForm action="/search" placeholder="Search businesses, products, jobs…" />
        </div>
        {!viewer ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="green">
              <Link href="/sign-up">Join your community</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link href="/explore">Explore</Link>
            </Button>
          </div>
        ) : !communityId ? (
          <Button asChild variant="green" className="mt-4">
            <Link href="/profile/edit">Choose your community</Link>
          </Button>
        ) : null}
      </section>

      {alerts.length > 0 ? (
        <Section
          title="Emergency information"
          action={
            <Link href="/emergency" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          <ul className="grid gap-2">
            {alerts.slice(0, 2).map((a) => (
              <li key={a.id}>
                <Link href={`/emergency/${a.id}`} className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:shadow-md">
                  <Siren aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <h3 className="font-semibold">{a.title}</h3>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Explore your community">
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
          {DIRECTORY_NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1.5 rounded-xl p-2 text-center text-xs font-medium hover:bg-card hover:shadow-xs"
              >
                <span
                  className={
                    href === "/emergency"
                      ? "flex size-11 items-center justify-center rounded-2xl bg-destructive-soft text-destructive"
                      : "flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground"
                  }
                >
                  <Icon aria-hidden className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <AdSlot placement="home_feed" communityId={communityId} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Section
          title={community ? `Happening in ${community.name}` : "Community updates"}
          action={
            <Button asChild size="sm" variant="soft">
              <Link href="/community/new">
                <PlusCircle aria-hidden /> Post
              </Link>
            </Button>
          }
        >
          {feed.items.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description="Be the first to share news, ask a question or recommend something."
              action={
                <Button asChild>
                  <Link href="/community/new">Create a post</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {feed.items.map((post) => (
                <PostCard key={post.id} post={post} reacted={reactions.has(post.id)} viewerId={viewer?.id} />
              ))}
              <Button asChild variant="outline" className="w-full">
                <Link href="/community">
                  See all community posts <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          )}
        </Section>

        <div className="space-y-8">
          <Section title="Upcoming events" action={<Link href="/events" className="text-sm font-medium text-primary hover:underline">All events</Link>}>
            {events.items.length ? (
              <div className="space-y-2">{events.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            )}
          </Section>
          <Section title="Latest jobs" action={<Link href="/jobs" className="text-sm font-medium text-primary hover:underline">All jobs</Link>}>
            {jobs.items.length ? (
              <div className="space-y-2">{jobs.items.map((j) => <JobCard key={j.id} job={j} />)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No open jobs right now.</p>
            )}
          </Section>
        </div>
      </div>

      <Section title="From local sellers" action={<Link href="/marketplace" className="text-sm font-medium text-primary hover:underline">Marketplace</Link>}>
        {products.items.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {products.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No products listed nearby yet.</p>
        )}
      </Section>
    </div>
  );
}
