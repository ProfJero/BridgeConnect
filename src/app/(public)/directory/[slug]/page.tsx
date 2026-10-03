import { Globe, Mail, MapPin, MessageCircle, Phone, Settings } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/cards/product-card";
import { EventCard, JobCard } from "@/components/cards/listing-cards";
import { EntityAvatar } from "@/components/shared/avatars";
import { Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { getEntityBySlug, getEntityListings } from "@/features/directory/queries";
import { isFavourite } from "@/features/favourites/queries";
import { getViewer } from "@/lib/auth/session";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<(typeof DAYS)[number], string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};
type Hours = Partial<Record<(typeof DAYS)[number], { open: string; close: string } | null>>;

export async function generateMetadata({ params }: PageProps<"/directory/[slug]">): Promise<Metadata> {
  const entity = await getEntityBySlug((await params).slug);
  return entity ? { title: entity.name, description: entity.tagline ?? undefined } : { title: "Not found" };
}

export default async function EntityProfilePage({ params }: PageProps<"/directory/[slug]">) {
  const { slug } = await params;
  const [entity, viewer] = await Promise.all([getEntityBySlug(slug), getViewer()]);
  if (!entity) notFound();

  const [listings, saved] = await Promise.all([
    getEntityListings(entity.id),
    isFavourite("entity", entity.id, viewer?.id),
  ]);
  const isMember = viewer?.workspaces.some((w) => w.entityId === entity.id) ?? false;
  const cover = publicMediaUrl(entity.cover_path);
  const hours = (entity.opening_hours ?? null) as Hours | null;
  const community = entity.communities;
  const about = entity.organisation_profiles?.mission;
  const biz = entity.business_profiles;
  const whatsapp = entity.whatsapp?.replace(/[^0-9]/g, "");

  return (
    <div className="space-y-6">
      {entity.status !== "active" ? (
        <Alert variant="warning">
          <AlertDescription>
            <span className="flex items-center gap-2">
              <StatusBadge status={entity.status} /> This listing is not publicly visible. {entity.status_reason}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="relative h-32 bg-gradient-to-r from-primary to-brand-green sm:h-44">
          {cover ? <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="-mt-14 flex flex-col gap-3 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
            <EntityAvatar name={entity.name} path={entity.logo_path} className="size-20 border-4 border-card bg-card sm:size-24" />
            <div className="flex flex-wrap gap-2">
              {isMember ? (
                <Button asChild variant="soft">
                  <Link href={`/workspace/${entity.id}`}>
                    <Settings aria-hidden /> Manage
                  </Link>
                </Button>
              ) : null}
              <FavouriteButton kind="entity" id={entity.id} initial={saved} signedIn={Boolean(viewer)} />
              {!isMember ? <ReportDialog targetKind="entity" targetId={entity.id} signedIn={Boolean(viewer)} variant="outline" /> : null}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{entity.name}</h1>
              <VerifiedBadge />
            </div>
            {entity.tagline ? <p className="text-muted-foreground">{entity.tagline}</p> : null}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="soft">{ENTITY_TYPE_LABEL[entity.entity_type]}</Badge>
              <Badge variant="secondary">{SECTOR_LABEL[entity.sector]}</Badge>
              {community ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="size-4" />
                  {community.name}
                  {community.districts ? `, ${community.districts.name}` : null}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {entity.phone ? (
              <Button asChild>
                <a href={`tel:${entity.phone.replace(/\s/g, "")}`}>
                  <Phone aria-hidden /> Call
                </a>
              </Button>
            ) : null}
            {whatsapp ? (
              <Button asChild variant="green">
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden /> WhatsApp
                </a>
              </Button>
            ) : null}
            {entity.email ? (
              <Button asChild variant="outline">
                <a href={`mailto:${entity.email}`}>
                  <Mail aria-hidden /> Email
                </a>
              </Button>
            ) : null}
            {entity.website ? (
              <Button asChild variant="outline">
                <a href={entity.website} target="_blank" rel="noopener noreferrer nofollow">
                  <Globe aria-hidden /> Website
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {entity.description || about ? (
            <Section title="About">
              <div className="space-y-3 rounded-xl border bg-card p-4 text-sm leading-relaxed">
                {entity.description ? <p className="whitespace-pre-line">{entity.description}</p> : null}
                {about ? (
                  <p>
                    <strong>Mission:</strong> {about}
                  </p>
                ) : null}
              </div>
            </Section>
          ) : null}

          {listings.products.length ? (
            <Section title="Products">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {listings.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </Section>
          ) : null}

          {listings.services.length ? (
            <Section title="Services">
              <ul className="divide-y rounded-xl border bg-card">
                {listings.services.map((s) => (
                  <li key={s.id}>
                    <Link href={`/services/${s.slug}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {s.price_from != null ? `From ${formatMoney(s.price_from, s.currency)}` : s.price_note ?? ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {listings.jobs.length ? (
            <Section title="Open jobs">
              <div className="grid gap-3">
                {listings.jobs.map((j) => (
                  <JobCard key={j.id} job={{ ...j, entities: { name: entity.name, logo_path: entity.logo_path } }} />
                ))}
              </div>
            </Section>
          ) : null}

          {listings.events.length ? (
            <Section title="Upcoming events">
              <div className="grid gap-3">
                {listings.events.map((e) => (
                  <EventCard key={e.id} event={{ ...e, entities: { name: entity.name } }} />
                ))}
              </div>
            </Section>
          ) : null}

          {listings.posts.length ? (
            <Section title="Updates">
              <ul className="space-y-3">
                {listings.posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/community/posts/${p.id}`} className="block rounded-xl border bg-card p-4 hover:shadow-md">
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

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {entity.address ? <p><span className="text-muted-foreground">Address:</span> {entity.address}</p> : null}
              {entity.phone ? <p><span className="text-muted-foreground">Phone:</span> {entity.phone}</p> : null}
              <p><span className="text-muted-foreground">Verified since:</span> {formatDate(entity.verified_at)}</p>
              {biz?.year_established ?? entity.organisation_profiles?.year_established ? (
                <p><span className="text-muted-foreground">Established:</span> {biz?.year_established ?? entity.organisation_profiles?.year_established}</p>
              ) : null}
              {biz ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {biz.delivery_available ? <Badge variant="green">Delivery available</Badge> : null}
                  {biz.accepts_mobile_money ? <Badge variant="green">Mobile money</Badge> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
          {hours ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opening hours</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {DAYS.map((d) => (
                    <div key={d} className="contents">
                      <dt className="text-muted-foreground">{DAY_LABEL[d]}</dt>
                      <dd>{hours[d] ? `${hours[d]!.open} – ${hours[d]!.close}` : "Closed"}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
