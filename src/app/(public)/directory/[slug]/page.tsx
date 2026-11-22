import { Clock, Globe, Mail, MapPin, MessageCircle, Navigation, Phone, Settings, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventCard, JobCard, ServiceCard } from "@/components/cards/listing-cards";
import { ProductCard } from "@/components/cards/product-card";
import { EntityAvatar } from "@/components/shared/avatars";
import { EmptyState } from "@/components/shared/empty-state";
import { JsonLd } from "@/components/shared/json-ld";
import { Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { ShareButton } from "@/components/widgets/share-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { getEntityBySlug, getEntityListings } from "@/features/directory/queries";
import { getSavedIds, isFavourite } from "@/features/favourites/queries";
import { FollowButton } from "@/features/follows/components/follow-button";
import { isFollowing } from "@/features/follows/queries";
import { ContactDialog } from "@/features/messages/components/contact-dialog";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { ReviewDialog } from "@/features/reviews/components/review-form";
import { RatingSummary, ReviewItem } from "@/features/reviews/components/review-list";
import { getMyReview, getRatingDistribution, listEntityReviews } from "@/features/reviews/queries";
import { getViewer } from "@/lib/auth/session";
import { telLink, whatsappLink } from "@/lib/contact";
import { formatDate, formatRelative } from "@/lib/format";
import { DAYS, openState, type OpeningHours } from "@/lib/opening-hours";
import { excerpt, pageMetadata } from "@/lib/seo";
import { publicMediaUrl } from "@/lib/storage";
import { breadcrumbSchema, entitySchema } from "@/lib/structured-data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const DAY_LABEL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" } as const;
type Tab = "about" | "products" | "services" | "reviews" | "photos" | "updates";
const TAB_LABEL: Record<Tab, string> = {
  about: "About", products: "Products", services: "Services", reviews: "Reviews", photos: "Photos", updates: "Updates",
};

export async function generateMetadata({ params }: PageProps<"/directory/[slug]">): Promise<Metadata> {
  const entity = await getEntityBySlug((await params).slug);
  if (!entity) return { title: "Not found" };
  const place = entity.communities ? ` in ${entity.communities.name}` : "";
  return pageMetadata({
    title: `${entity.name} — ${ENTITY_TYPE_LABEL[entity.entity_type]}${place}`,
    description: excerpt(
      [entity.tagline, entity.description, `${SECTOR_LABEL[entity.sector]}${place}. Verified on BridgeConnect.`]
        .filter(Boolean)
        .join(" "),
    ),
    path: `/directory/${entity.slug}`,
    image: publicMediaUrl(entity.cover_path) ?? publicMediaUrl(entity.logo_path),
  });
}

export default async function EntityProfilePage({ params, searchParams }: PageProps<"/directory/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const [entity, viewer] = await Promise.all([getEntityBySlug(slug), getViewer()]);
  if (!entity) notFound();

  const supabase = await createClient();
  const [listings, saved, following, reviews, distribution, myReview, { data: features }, { data: photos }] = await Promise.all([
    getEntityListings(entity.id),
    isFavourite("entity", entity.id, viewer?.id),
    isFollowing(entity.id, viewer?.id),
    listEntityReviews(entity.id, { pageSize: 20 }),
    getRatingDistribution(entity.id),
    getMyReview(entity.id, viewer?.id),
    supabase.rpc("entity_public_features", { p_entity: entity.id }).maybeSingle(),
    supabase.from("media_assets").select("id, storage_path, alt_text").eq("entity_id", entity.id).order("created_at", { ascending: false }).limit(24),
  ]);
  const savedProducts = await getSavedIds("product", listings.products.map((p) => p.id), viewer?.id);
  const acceptsReviews = Boolean(features?.reviews);
  const acceptsMessages = Boolean(features?.messages);
  const isMember = viewer?.workspaces.some((w) => w.entityId === entity.id) ?? false;
  const cover = publicMediaUrl(entity.cover_path);
  const hours = (entity.opening_hours ?? null) as OpeningHours | null;
  const state = openState(hours);
  const community = entity.communities;
  const about = entity.organisation_profiles?.mission;
  const biz = entity.business_profiles;
  const whatsapp = whatsappLink(entity.whatsapp ?? entity.phone, `Hello ${entity.name}, I found you on BridgeConnect.`);
  const call = telLink(entity.phone);
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [entity.name, entity.address, community?.name, community?.districts?.name, "Ghana"].filter(Boolean).join(", "),
  )}`;

  const available: Tab[] = [
    "about",
    ...(listings.products.length ? (["products"] as const) : []),
    ...(listings.services.length ? (["services"] as const) : []),
    ...(acceptsReviews ? (["reviews"] as const) : []),
    ...(photos?.length ? (["photos"] as const) : []),
    ...(listings.posts.length || listings.jobs.length || listings.events.length ? (["updates"] as const) : []),
  ];
  const tab: Tab = available.includes(sp.tab as Tab) ? (sp.tab as Tab) : "about";
  const tabHref = (t: Tab) => (t === "about" ? `/directory/${entity.slug}` : `/directory/${entity.slug}?tab=${t}`);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {entity.status === "active" ? (
        <JsonLd data={entitySchema({ ...entity, logo_url: publicMediaUrl(entity.logo_path), cover_url: cover, opening_hours: hours })} />
      ) : null}
      <JsonLd data={breadcrumbSchema([{ name: "Directory", path: "/explore" }, { name: entity.name, path: `/directory/${entity.slug}` }])} />
      {entity.status !== "active" ? (
        <Alert variant="warning">
          <AlertDescription>
            <span className="flex items-center gap-2"><StatusBadge status={entity.status} /> This listing is not publicly visible. {entity.status_reason}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="-mx-4 overflow-hidden bg-card sm:mx-0 sm:rounded-3xl sm:border sm:shadow-xs">
        <div className="relative h-44 bg-gradient-to-br from-brand-navy via-primary to-brand-green sm:h-56">
          {cover ? <Image src={cover} alt="" fill priority sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" /> : null}
          <div className="absolute top-3 right-3 flex gap-2">
            <FavouriteButton kind="entity" id={entity.id} initial={saved} signedIn={Boolean(viewer)} floating label={entity.name} />
          </div>
        </div>
        <div className="space-y-4 px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <EntityAvatar name={entity.name} path={entity.logo_path} className="size-24 rounded-3xl border-4 border-card bg-card shadow-md" />
            <div className="flex flex-wrap justify-end gap-2 pb-1">
              {isMember ? (
                <Button asChild variant="soft" size="sm" className="rounded-full"><Link href={`/workspace/${entity.id}`}><Settings aria-hidden /> Manage</Link></Button>
              ) : entity.status === "active" ? (
                <FollowButton entityId={entity.id} following={following} followers={entity.follower_count} signedIn={Boolean(viewer)} />
              ) : null}
            </div>
          </div>
          <div className="space-y-1.5">
            <h1 className="flex flex-wrap items-center gap-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {entity.name} <VerifiedBadge compact />
            </h1>
            <p className="text-sm font-medium text-muted-foreground">{ENTITY_TYPE_LABEL[entity.entity_type]} · {SECTOR_LABEL[entity.sector]}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {acceptsReviews ? (
                <Link href={tabHref("reviews")} className="inline-flex hover:underline">
                  {entity.rating_count ? <RatingStars value={entity.rating_avg} count={entity.rating_count} size="md" /> : <span className="text-muted-foreground">No reviews yet</span>}
                </Link>
              ) : null}
              {state ? (
                <span className={cn("inline-flex items-center gap-1 font-semibold", state === "open" ? "text-brand-green" : "text-muted-foreground")}>
                  <Clock aria-hidden className="size-4" /> {state === "open" ? "Open now" : "Closed now"}
                </span>
              ) : null}
            </div>
            {community ? (
              <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin aria-hidden className="size-4 text-brand-green" />
                {[entity.address, community.name, community.districts?.name].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {entity.tagline ? <p className="text-sm">{entity.tagline}</p> : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {call ? (
              <Button asChild variant="green" className="rounded-xl"><a href={call}><Phone aria-hidden /> Call</a></Button>
            ) : <span />}
            {whatsapp ? (
              <Button asChild variant="green" className="rounded-xl"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button>
            ) : <span />}
            <Button asChild className="rounded-xl"><a href={directions} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden /> Directions</a></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {acceptsMessages && !isMember && entity.status === "active" ? (
              <ContactDialog entityId={entity.id} entityName={entity.name} signedIn={Boolean(viewer)} variant="outline" />
            ) : null}
            <ShareButton path={`/directory/${entity.slug}`} title={entity.name} text={entity.tagline ?? undefined} />
            {!isMember ? <ReportDialog targetKind="entity" targetId={entity.id} signedIn={Boolean(viewer)} variant="outline" /> : null}
          </div>
        </div>

        <nav aria-label={`${entity.name} sections`} className="no-scrollbar sticky top-14 z-20 flex overflow-x-auto border-t border-b bg-card/95 px-2 backdrop-blur sm:px-4">
          {available.map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              scroll={false}
              aria-current={tab === t ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                tab === t && "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
              )}
            >
              {TAB_LABEL[t]}
              {t === "reviews" && entity.rating_count ? <span className="ml-1 text-xs text-muted-foreground">({entity.rating_count})</span> : null}
            </Link>
          ))}
        </nav>
      </section>

      <div key={tab} className="animate-page">
        {tab === "about" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              {entity.description || about ? (
                <Section title="About">
                  <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm leading-relaxed">
                    {entity.description ? <p className="whitespace-pre-line">{entity.description}</p> : null}
                    {about ? <p><strong>Mission:</strong> {about}</p> : null}
                  </div>
                </Section>
              ) : null}
              {listings.products.length ? (
                <Section title="Top products" action={<Link href={tabHref("products")} className="text-sm font-semibold text-primary">View all</Link>}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {listings.products.slice(0, 3).map((p) => (
                      <ProductCard key={p.id} product={{ ...p, entities: null }} saved={savedProducts.has(p.id)} signedIn={Boolean(viewer)} />
                    ))}
                  </div>
                </Section>
              ) : null}
            </div>
            <aside className="space-y-4">
              <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
                <h2 className="font-semibold">Details</h2>
                {entity.phone ? <p className="flex items-center gap-2"><Phone aria-hidden className="size-4 text-muted-foreground" /> {entity.phone}</p> : null}
                {entity.email ? <p className="flex items-center gap-2 break-all"><Mail aria-hidden className="size-4 shrink-0 text-muted-foreground" /> <a className="hover:underline" href={`mailto:${entity.email}`}>{entity.email}</a></p> : null}
                {entity.website ? <p className="flex items-center gap-2 break-all"><Globe aria-hidden className="size-4 shrink-0 text-muted-foreground" /> <a className="hover:underline" href={entity.website} target="_blank" rel="noopener noreferrer nofollow">{entity.website.replace(/^https:\/\//, "")}</a></p> : null}
                <p className="text-muted-foreground">Verified since {formatDate(entity.verified_at)}</p>
                {biz?.year_established ?? entity.organisation_profiles?.year_established ? (
                  <p className="text-muted-foreground">Established {biz?.year_established ?? entity.organisation_profiles?.year_established}</p>
                ) : null}
                {biz ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {biz.delivery_available ? <Badge variant="green">Delivery available</Badge> : null}
                    {biz.accepts_mobile_money ? <Badge variant="green">Mobile money</Badge> : null}
                  </div>
                ) : null}
              </div>
              {hours ? (
                <div className="rounded-2xl border bg-card p-4">
                  <h2 className="mb-2 font-semibold">Opening hours</h2>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {DAYS.map((d) => (
                      <div key={d} className="contents">
                        <dt className="text-muted-foreground">{DAY_LABEL[d]}</dt>
                        <dd>{hours[d] ? `${hours[d]!.open} – ${hours[d]!.close}` : "Closed"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}

        {tab === "products" ? (
          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.products.map((p) => (
              <ProductCard key={p.id} product={{ ...p, entities: null }} saved={savedProducts.has(p.id)} signedIn={Boolean(viewer)} />
            ))}
          </div>
        ) : null}

        {tab === "services" ? (
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {listings.services.map((s) => <ServiceCard key={s.id} service={{ ...s, entities: { name: entity.name } }} />)}
          </div>
        ) : null}

        {tab === "reviews" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Reviews</h2>
              {!isMember && entity.status === "active" ? (
                <ReviewDialog entityId={entity.id} entityName={entity.name} signedIn={Boolean(viewer)} existing={myReview} />
              ) : null}
            </div>
            {reviews.total > 0 ? (
              <>
                <RatingSummary average={entity.rating_avg} count={entity.rating_count} distribution={distribution} />
                <div className="stagger space-y-3">
                  {reviews.items.map((r) => <ReviewItem key={r.id} review={r} entityName={entity.name} viewerId={viewer?.id} />)}
                </div>
              </>
            ) : (
              <EmptyState icon={Star} title="No reviews yet" description="Be the first to share your experience." />
            )}
          </div>
        ) : null}

        {tab === "photos" ? (
          <ul className="stagger grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {(photos ?? []).map((m) => (
              <li key={m.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                <Image src={publicMediaUrl(m.storage_path, 480)!} alt={m.alt_text ?? `Photo from ${entity.name}`} fill sizes="(min-width: 640px) 25vw, 33vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "updates" ? (
          <div className="space-y-6">
            {listings.jobs.length ? (
              <Section title="Open jobs">
                <div className="grid gap-3">
                  {listings.jobs.map((j) => <JobCard key={j.id} job={{ ...j, entities: { name: entity.name, logo_path: entity.logo_path } }} />)}
                </div>
              </Section>
            ) : null}
            {listings.events.length ? (
              <Section title="Upcoming events">
                <div className="grid gap-3">
                  {listings.events.map((e) => <EventCard key={e.id} event={{ ...e, entities: { name: entity.name } }} />)}
                </div>
              </Section>
            ) : null}
            {listings.posts.length ? (
              <Section title="Posts">
                <ul className="space-y-3">
                  {listings.posts.map((p) => (
                    <li key={p.id}>
                      <Link href={`/community/posts/${p.id}`} className="pressable block rounded-2xl border bg-card p-4 hover:shadow-md">
                        {p.title ? <p className="font-semibold">{p.title}</p> : null}
                        <p className="line-clamp-3 text-sm text-muted-foreground">{p.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatRelative(p.created_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
