import { CalendarDays, Globe, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityAvatar } from "@/components/shared/avatars";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RsvpButtons } from "@/features/events/components/rsvp-buttons";
import { getEventBySlug, getMyRsvp } from "@/features/events/queries";
import { isFavourite } from "@/features/favourites/queries";
import { getViewer } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return { title: event?.title ?? "Event not found" };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const [event, viewer] = await Promise.all([getEventBySlug(slug), getViewer()]);
  if (!event) notFound();
  const [saved, rsvp] = await Promise.all([
    isFavourite("event", event.id, viewer?.id),
    viewer ? getMyRsvp(event.id, viewer.id) : null,
  ]);
  const cover = publicMediaUrl(event.cover_path);
  const past = new Date(event.ends_at ?? event.starts_at) < new Date();
  const full = event.capacity != null && event.going_count >= event.capacity && rsvp !== "going";

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {cover ? (
        <div className="relative aspect-[2/1] overflow-hidden rounded-2xl bg-muted">
          <Image src={cover} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="space-y-3">
        {event.listing_categories ? <Badge variant="soft">{event.listing_categories.name}</Badge> : null}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{event.title}</h1>
        <Link href={`/directory/${event.entities.slug}`} className="flex items-center gap-2 hover:underline">
          <EntityAvatar name={event.entities.name} path={event.entities.logo_path} className="size-8" />
          <span className="font-medium">{event.entities.name}</span> <VerifiedBadge compact />
        </Link>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><CalendarDays aria-hidden className="size-4 text-muted-foreground" /> {formatDateTime(event.starts_at)}{event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ""}</li>
          <li className="flex items-center gap-2">
            {event.is_online ? <Globe aria-hidden className="size-4 text-muted-foreground" /> : <MapPin aria-hidden className="size-4 text-muted-foreground" />}
            {event.is_online ? "Online" : event.venue}{event.communities ? ` · ${event.communities.name}` : ""}
          </li>
          <li className="flex items-center gap-2"><Users aria-hidden className="size-4 text-muted-foreground" /> {event.going_count} going{event.capacity ? ` · ${event.capacity} places` : ""}</li>
        </ul>
      </div>
      {event.status === "cancelled" ? (
        <Alert variant="destructive"><AlertDescription>This event has been cancelled.</AlertDescription></Alert>
      ) : past ? (
        <Alert><AlertDescription>This event has ended.</AlertDescription></Alert>
      ) : !viewer ? (
        <Button asChild><Link href={`/sign-in?next=/events/${event.slug}`}>Sign in to RSVP</Link></Button>
      ) : !viewer.isActive ? null : full ? (
        <Alert variant="warning"><AlertDescription>This event is full.</AlertDescription></Alert>
      ) : (
        <RsvpButtons eventId={event.id} slug={event.slug} current={rsvp} />
      )}
      {event.is_online && event.online_url && rsvp === "going" ? (
        <Alert variant="info"><AlertDescription>Join online: <a className="font-semibold underline" href={event.online_url} target="_blank" rel="noopener noreferrer">{event.online_url}</a></AlertDescription></Alert>
      ) : null}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">About this event</h2>
        <p className="leading-relaxed whitespace-pre-line">{event.description}</p>
      </section>
      <div className="flex gap-2">
        <FavouriteButton kind="event" id={event.id} initial={saved} signedIn={Boolean(viewer)} />
        <ReportDialog targetKind="event" targetId={event.id} signedIn={Boolean(viewer)} variant="outline" />
      </div>
    </article>
  );
}
