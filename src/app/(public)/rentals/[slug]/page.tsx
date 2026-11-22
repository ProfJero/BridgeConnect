import { Bath, BedDouble, CalendarDays, Check, MapPin, MessageCircle, Navigation, Pencil, Phone, ShieldAlert, Sofa, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Carousel } from "@/components/app/carousel";
import { UserAvatar } from "@/components/shared/avatars";
import { JsonLd } from "@/components/shared/json-ld";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { ShareButton } from "@/components/widgets/share-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InquiryDialog } from "@/features/rentals/components/inquiry-dialog";
import { getRentalBySlug } from "@/features/rentals/queries";
import { PERIOD_SHORT, RENTAL_TYPE_LABEL } from "@/features/rentals/schemas";
import { getViewer } from "@/lib/auth/session";
import { directionsUrl, telLink, whatsappLink } from "@/lib/contact";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { absoluteUrl, excerpt, pageMetadata } from "@/lib/seo";
import { publicMediaUrl } from "@/lib/storage";
import { breadcrumbSchema, rentalSchema } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/rentals/[slug]">): Promise<Metadata> {
  const r = await getRentalBySlug((await params).slug);
  if (!r) return { title: "Rental not found" };
  const image = orderedMedia(r.rental_media)[0];
  return pageMetadata({
    title: `${r.title} — ${formatMoney(r.price, r.currency)}${PERIOD_SHORT[r.period]}`,
    description: excerpt(`${RENTAL_TYPE_LABEL[r.rental_type]} for rent in ${r.communities?.name ?? "Ghana"}. ${r.description}`),
    path: `/rentals/${r.slug}`,
    image: image ? publicMediaUrl(image.path) : undefined,
  });
}

export default async function RentalPage({ params }: PageProps<"/rentals/[slug]">) {
  const { slug } = await params;
  const [rental, viewer] = await Promise.all([getRentalBySlug(slug), getViewer()]);
  if (!rental) notFound();
  const media = orderedMedia(rental.rental_media);
  const isOwner = viewer?.id === rental.owner_id;
  const call = telLink(rental.contact_phone);
  const whatsapp = whatsappLink(rental.whatsapp, `Hello, I saw "${rental.title}" on BridgeConnect: ${absoluteUrl(`/rentals/${rental.slug}`)}`);
  const directions = directionsUrl({
    lat: rental.latitude,
    lng: rental.longitude,
    query: [rental.location_note, rental.communities?.name, rental.communities?.districts?.name, "Ghana"].filter(Boolean).join(", "),
  });
  const facts = [
    rental.bedrooms != null ? { icon: BedDouble, label: `${rental.bedrooms} bedroom${rental.bedrooms === 1 ? "" : "s"}` } : null,
    rental.bathrooms != null ? { icon: Bath, label: `${rental.bathrooms} bathroom${rental.bathrooms === 1 ? "" : "s"}` } : null,
    rental.furnished ? { icon: Sofa, label: "Furnished" } : null,
    rental.advance_months ? { icon: Wallet, label: `${rental.advance_months} months advance` } : null,
    rental.available_from ? { icon: CalendarDays, label: `From ${formatDate(rental.available_from)}` } : null,
  ].filter(Boolean) as { icon: typeof Bath; label: string }[];

  return (
    <article className="mx-auto max-w-3xl space-y-5 pb-20 sm:pb-0">
      {rental.status === "available" ? (
        <JsonLd data={rentalSchema({ ...rental, images: media.map((m) => publicMediaUrl(m.path)!) })} />
      ) : null}
      <JsonLd data={breadcrumbSchema([{ name: "Rentals", path: "/rentals" }, { name: rental.title, path: `/rentals/${rental.slug}` }])} />
      {rental.status !== "available" ? (
        <Alert variant="warning"><AlertDescription><span className="flex items-center gap-2"><StatusBadge status={rental.status} /> {rental.moderation_reason ?? "This property is not taking enquiries."}</span></AlertDescription></Alert>
      ) : null}
      <div className="-mx-4 sm:mx-0">
        {media.length ? (
          <Carousel label="Photos">
            {media.map((m, i) => (
              <div key={m.path} className="relative aspect-[4/3] bg-muted sm:rounded-2xl">
                <Image src={publicMediaUrl(m.path)!} alt={m.alt || `${rental.title} photo ${i + 1}`} fill priority={i === 0} sizes="(min-width: 768px) 768px, 100vw" className="object-cover sm:rounded-2xl" />
              </div>
            ))}
          </Carousel>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-warning-soft to-primary-soft text-sm text-muted-foreground sm:rounded-2xl">No photos yet</div>
        )}
      </div>
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-link uppercase">{RENTAL_TYPE_LABEL[rental.rental_type]} for rent</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{rental.title}</h1>
        <p className="text-2xl font-extrabold text-price">
          {formatMoney(rental.price, rental.currency)}<span className="text-base font-medium text-muted-foreground">{PERIOD_SHORT[rental.period]}</span>
        </p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin aria-hidden className="size-4 text-price" />
          {[rental.location_note, rental.communities?.name, rental.communities?.districts?.name].filter(Boolean).join(", ")}
        </p>
        <a href={directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-soft-foreground hover:brightness-95">
          <Navigation aria-hidden className="size-4" /> Get directions
        </a>
      </header>
      {facts.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium"><Icon aria-hidden className="size-4 text-link" /> {label}</li>
          ))}
        </ul>
      ) : null}
      <section className="space-y-2">
        <h2 className="font-bold">About this property</h2>
        <p className="leading-relaxed whitespace-pre-line text-muted-foreground">{rental.description}</p>
      </section>
      {rental.amenities.length ? (
        <section className="space-y-2">
          <h2 className="font-bold">Amenities</h2>
          <ul className="flex flex-wrap gap-2">
            {rental.amenities.map((a) => (
              <li key={a} className="inline-flex items-center gap-1 rounded-full bg-brand-green-soft px-3 py-1 text-sm text-brand-green-soft-foreground"><Check aria-hidden className="size-3.5" /> {a}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <UserAvatar name={rental.profiles?.display_name ?? "Landlord"} path={rental.profiles?.avatar_path} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{rental.profiles?.display_name ?? "Landlord"}</p>
          <p className="text-xs text-muted-foreground">Listed {formatRelative(rental.created_at)}</p>
        </div>
        {call && viewer ? <Button asChild variant="outline" size="icon" className="rounded-full"><a href={call} aria-label="Call the landlord"><Phone aria-hidden /></a></Button> : null}
        {whatsapp && viewer ? <Button asChild variant="green" size="icon" className="rounded-full"><a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp the landlord"><MessageCircle aria-hidden /></a></Button> : null}
      </div>
      <p className="flex gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning-soft-foreground">
        <ShieldAlert aria-hidden className="size-4 shrink-0" />
        Always view a property in person before paying anything. Never send a deposit to someone you haven&apos;t met.
      </p>
      <div className="flex flex-wrap gap-2">
        <ShareButton path={`/rentals/${rental.slug}`} title={rental.title} />
        {isOwner ? (
          <Button asChild variant="outline"><Link href={`/rentals/${rental.slug}/edit`}><Pencil aria-hidden /> Edit listing</Link></Button>
        ) : (
          <ReportDialog targetKind="rental" targetId={rental.id} signedIn={Boolean(viewer)} variant="outline" />
        )}
      </div>
      {!isOwner && rental.status === "available" ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t bg-card/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <InquiryDialog rentalId={rental.id} title={rental.title} signedIn={Boolean(viewer)} />
          {call ? (
            viewer ? (
              <Button asChild variant="green" size="lg" className="rounded-full"><a href={call}><Phone aria-hidden /> Call</a></Button>
            ) : (
              <Button asChild variant="green" size="lg" className="rounded-full"><Link href={`/sign-in?next=/rentals/${rental.slug}`}><Phone aria-hidden /> Call</Link></Button>
            )
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
