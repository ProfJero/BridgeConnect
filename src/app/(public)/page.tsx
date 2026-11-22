import { ArrowRight, Bike, Building2, ChevronRight, House, MapPin, Search, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Carousel } from "@/components/app/carousel";
import { BusinessTile } from "@/components/cards/business-tile";
import { EventCard, JobCard } from "@/components/cards/listing-cards";
import { ProductCard } from "@/components/cards/product-card";
import { QUICK_SERVICES } from "@/components/layout/nav-config";
import { EntityAvatar, UserAvatar } from "@/components/shared/avatars";
import { JsonLd } from "@/components/shared/json-ld";
import { Section } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { listFeed } from "@/features/community/queries";
import { listPopularEntities } from "@/features/directory/queries";
import { getActiveAlerts, getAlertsForCommunity } from "@/features/emergency/queries";
import { listEvents } from "@/features/events/queries";
import { getSavedIds } from "@/features/favourites/queries";
import { listJobs } from "@/features/jobs/queries";
import { getCommunityName } from "@/features/locations/queries";
import { listProducts } from "@/features/marketplace/queries";
import { getViewer } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_GH",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

function greeting(now = new Date()) {
  const h = now.getUTCHours(); // Ghana = GMT
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const SLIDES = [
  {
    href: "/rides",
    eyebrow: "Rides & delivery",
    title: "Get a ride or send a package",
    body: "Okada, tricycle, taxi and dispatch riders near you.",
    cta: "Request now",
    icon: Bike,
    tone: "from-hero-1 via-hero-2 to-hero-2",
  },
  {
    href: "/apply",
    eyebrow: "For businesses",
    title: "Put your business on BridgeConnect",
    body: "Get verified and manage orders, bookings and messages in one dashboard.",
    cta: "Register free",
    icon: Building2,
    tone: "from-brand-green to-brand-navy",
  },
  {
    href: "/rentals",
    eyebrow: "Rentals",
    title: "Find a room, house or shop",
    body: "Browse rentals in your community or list your own property.",
    cta: "Browse rentals",
    icon: House,
    tone: "from-brand-amber to-destructive",
  },
] as const;

export default async function HomePage() {
  const viewer = await getViewer();
  const communityId = viewer?.profile.home_community_id ?? undefined;
  const [community, feed, products, events, jobs, alerts, popular] = await Promise.all([
    getCommunityName(communityId),
    listFeed({ communityId, pageSize: 4 }),
    listProducts({ communityId, pageSize: 4 }),
    listEvents({ pageSize: 3 }),
    listJobs({ pageSize: 3 }),
    communityId ? getAlertsForCommunity(communityId) : getActiveAlerts(3),
    listPopularEntities({ limit: 10 }),
  ]);
  const saved = await getSavedIds("product", products.items.map((p) => p.id), viewer?.id);
  const firstName = viewer?.profile.display_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      {/* Greeting */}
      <section className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{viewer ? `${greeting()},` : "Akwaaba! Welcome to"}</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">
            {viewer ? <>{firstName} <span aria-hidden>👋</span></> : <>Bridge<span className="text-price">Connect</span></>}
          </h1>
          {community ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden className="size-4 text-price" /> {community.name}, {community.districtName}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Connecting Communities. Empowering Lives.</p>
          )}
        </div>
      </section>

      {/* Search pill (desktop uses the header search) */}
      <form action="/search" role="search" className="md:hidden">
        <label className="relative block">
          <span className="sr-only">Search BridgeConnect</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            placeholder="Search businesses, jobs, products, services…"
            className="h-12 w-full rounded-2xl border bg-card pr-4 pl-12 text-[15px] shadow-xs outline-none transition focus:border-primary focus:ring-[3px] focus:ring-ring/25"
          />
        </label>
      </form>

      {/* Banners */}
      <Carousel label="Featured">
        {SLIDES.map(({ href, eyebrow, title, body, cta, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex min-h-40 overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-5 text-white shadow-md sm:min-h-44 sm:p-7`}
          >
            <div className="relative z-10 max-w-[70%] space-y-1.5">
              <p className="text-xs font-semibold tracking-wide uppercase opacity-85">{eyebrow}</p>
              <p className="text-xl leading-tight font-extrabold sm:text-2xl">{title}</p>
              <p className="text-sm opacity-90">{body}</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-hero-1 shadow-sm">
                {cta} <ArrowRight aria-hidden className="size-3.5" />
              </span>
            </div>
            <Icon aria-hidden className="absolute -right-4 -bottom-6 size-40 text-white/15 sm:size-48" strokeWidth={1.25} />
          </Link>
        ))}
      </Carousel>

      {alerts.length ? (
        <ul className="grid gap-2">
          {alerts.slice(0, 2).map((a) => (
            <li key={a.id}>
              <Link href={`/emergency/${a.id}`} className="pressable flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive-soft/50 p-4">
                <Siren aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={a.severity} />
                    <h2 className="font-semibold">{a.title}</h2>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Quick services */}
      <Section title="Quick services" action={<Link href="/explore" className="text-sm font-semibold text-link">View all</Link>}>
        <ul className="stagger grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
          {QUICK_SERVICES.map(({ href, label, icon: Icon, tone }, i) => (
            <li key={href} className={i >= 8 ? "hidden sm:block" : undefined}>
              <Link href={href} className="group flex flex-col items-center gap-1.5 text-center">
                <span className={`flex size-14 items-center justify-center rounded-2xl ${tone} shadow-xs transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-90`}>
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="text-xs leading-tight font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {popular.length ? (
        <Section title="Popular businesses" action={<Link href="/businesses" className="text-sm font-semibold text-link">View all</Link>}>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {popular.map((e) => <BusinessTile key={e.id} entity={e} />)}
          </div>
        </Section>
      ) : null}

      {jobs.items.length ? (
        <Section title="Jobs near you" action={<Link href="/jobs" className="text-sm font-semibold text-link">View all</Link>}>
          <div className="stagger grid gap-2.5">
            {jobs.items.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </Section>
      ) : null}

      {products.items.length ? (
        <Section title="Community marketplace" action={<Link href="/marketplace" className="text-sm font-semibold text-link">View all</Link>}>
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            {products.items.map((p) => <ProductCard key={p.id} product={p} saved={saved.has(p.id)} signedIn={Boolean(viewer)} />)}
          </div>
        </Section>
      ) : null}

      <AdSlot placement="home_feed" communityId={communityId} />

      <Section title="Recent community updates" action={<Link href="/community" className="text-sm font-semibold text-link">View all</Link>}>
        {feed.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            No posts yet.{" "}
            <Link href="/community/new" className="font-semibold text-link">Start the conversation</Link>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {feed.items.map((p) => {
              const author = p.entities?.name ?? p.profiles?.display_name ?? "Resident";
              return (
                <li key={p.id}>
                  <Link href={`/community/posts/${p.id}`} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-accent">
                    {p.entities ? (
                      <EntityAvatar name={author} path={p.entities.logo_path} className="size-10 rounded-xl" />
                    ) : (
                      <UserAvatar name={author} path={p.profiles?.avatar_path} className="size-10" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.title ?? p.body}</span>
                      <span className="block truncate text-xs text-muted-foreground">{author}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(p.created_at)}</span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {events.items.length ? (
        <Section title="Upcoming events" action={<Link href="/events" className="text-sm font-semibold text-link">View all</Link>}>
          <div className="stagger grid gap-2.5">
            {events.items.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </Section>
      ) : null}

      {!viewer ? (
        <section className="rounded-2xl bg-gradient-to-br from-hero-1 to-hero-2 p-6 text-center text-white">
          <h2 className="text-xl font-bold">Join your community on BridgeConnect</h2>
          <p className="mx-auto mt-1 max-w-md text-sm opacity-90">Post updates, order from local sellers, book services, rent a place and get emergency alerts.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild variant="green" className="rounded-full"><Link href="/sign-up">Create account</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/sign-in">Sign in</Link></Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
