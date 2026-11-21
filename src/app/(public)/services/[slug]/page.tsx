import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityAvatar } from "@/components/shared/avatars";
import { JsonLd } from "@/components/shared/json-ld";
import { SafetyTips } from "@/components/shared/safety-tips";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { ShareButton } from "@/components/widgets/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingDialog } from "@/features/bookings/components/booking-form";
import { isFavourite } from "@/features/favourites/queries";
import { ContactDialog } from "@/features/messages/components/contact-dialog";
import { createClient } from "@/lib/supabase/server";
import { getServiceBySlug } from "@/features/marketplace/queries";
import { getViewer } from "@/lib/auth/session";
import { telLink, whatsappLink } from "@/lib/contact";
import { formatMoney } from "@/lib/format";
import { absoluteUrl, excerpt, pageMetadata } from "@/lib/seo";
import { publicMediaUrl } from "@/lib/storage";
import { breadcrumbSchema, serviceSchema } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const service = await getServiceBySlug((await params).slug);
  if (!service) return { title: "Service not found" };
  const area = service.service_area ?? service.entities.communities?.name;
  return pageMetadata({
    title: `${service.name} — ${service.entities.name}`,
    description: excerpt(`${service.name} by ${service.entities.name}${area ? `, serving ${area}` : ""}. ${service.description ?? ""}`),
    path: `/services/${service.slug}`,
    image: publicMediaUrl(service.entities.logo_path),
  });
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const [service, viewer] = await Promise.all([getServiceBySlug(slug), getViewer()]);
  if (!service) notFound();
  const supabase = await createClient();
  const [saved, { data: caps }] = await Promise.all([
    isFavourite("service", service.id, viewer?.id),
    supabase.rpc("entity_public_features", { p_entity: service.entity_id }).maybeSingle(),
  ]);
  const provider = service.entities;

  const isMember = viewer?.workspaces.some((w) => w.entityId === service.entity_id) ?? false;
  const bookable = service.status === "active" && service.accepts_bookings && Boolean(caps?.bookings) && !isMember;
  const whatsapp = whatsappLink(
    provider.whatsapp,
    `Hello ${provider.name}, I found "${service.name}" on BridgeConnect: ${absoluteUrl(`/services/${service.slug}`)}`,
  );
  const call = telLink(provider.phone);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <JsonLd data={serviceSchema({ ...service, category: service.listing_categories?.name, provider })} />
      <JsonLd data={breadcrumbSchema([{ name: "Services", path: "/services" }, { name: service.name, path: `/services/${service.slug}` }])} />
      <div className="space-y-3">
        {service.listing_categories ? <Badge variant="soft">{service.listing_categories.name}</Badge> : null}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{service.name}</h1>
        <p className="text-lg font-semibold text-primary">
          {service.price_from != null ? `From ${formatMoney(service.price_from, service.currency)}` : service.price_note ?? "Contact for pricing"}
        </p>
        {service.service_area ? (
          <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="size-4" /> Serves {service.service_area}
          </p>
        ) : null}
      </div>
      {service.description ? <p className="leading-relaxed whitespace-pre-line">{service.description}</p> : null}
      {bookable ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Book online</p>
            <p className="text-sm text-muted-foreground">Request a date and time — {provider.name} confirms it in the app.</p>
          </div>
          <BookingDialog serviceId={service.id} serviceName={service.name} providerName={provider.name} signedIn={Boolean(viewer)} />
        </div>
      ) : null}
      <div className="rounded-xl border bg-card p-4">
        <Link href={`/directory/${provider.slug}`} className="flex items-center gap-3 hover:underline">
          <EntityAvatar name={provider.name} path={provider.logo_path} className="size-11" />
          <div>
            <p className="flex items-center gap-1 font-semibold">{provider.name} <VerifiedBadge compact /></p>
            {provider.communities ? <p className="text-xs text-muted-foreground">{provider.communities.name}</p> : null}
          </div>
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          {Boolean(caps?.messages) && !isMember ? (
            <ContactDialog entityId={service.entity_id} entityName={provider.name} signedIn={Boolean(viewer)} defaultSubject={service.name} variant="default" />
          ) : null}
          {call ? (
            <Button asChild><a href={call}><Phone aria-hidden /> Call</a></Button>
          ) : null}
          {whatsapp ? (
            <Button asChild variant="green"><a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button>
          ) : null}
          {provider.email ? (
            <Button asChild variant="outline"><a href={`mailto:${provider.email}`}><Mail aria-hidden /> Email</a></Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <FavouriteButton kind="service" id={service.id} initial={saved} signedIn={Boolean(viewer)} />
        <ShareButton path={`/services/${service.slug}`} title={`${service.name} — ${provider.name}`} />
        <ReportDialog targetKind="service" targetId={service.id} signedIn={Boolean(viewer)} variant="outline" />
      </div>
      <SafetyTips kind="service" />
    </article>
  );
}
