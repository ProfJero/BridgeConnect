import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityAvatar } from "@/components/shared/avatars";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { FavouriteButton } from "@/components/widgets/favourite-button";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isFavourite } from "@/features/favourites/queries";
import { getServiceBySlug } from "@/features/marketplace/queries";
import { getViewer } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const service = await getServiceBySlug((await params).slug);
  return { title: service?.name ?? "Service not found" };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const [service, viewer] = await Promise.all([getServiceBySlug(slug), getViewer()]);
  if (!service) notFound();
  const saved = await isFavourite("service", service.id, viewer?.id);
  const provider = service.entities;
  const whatsapp = provider.whatsapp?.replace(/[^0-9]/g, "");

  return (
    <article className="mx-auto max-w-3xl space-y-6">
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
      <div className="rounded-xl border bg-card p-4">
        <Link href={`/directory/${provider.slug}`} className="flex items-center gap-3 hover:underline">
          <EntityAvatar name={provider.name} path={provider.logo_path} className="size-11" />
          <div>
            <p className="flex items-center gap-1 font-semibold">{provider.name} <VerifiedBadge compact /></p>
            {provider.communities ? <p className="text-xs text-muted-foreground">{provider.communities.name}</p> : null}
          </div>
        </Link>
        <div className="mt-4 flex flex-wrap gap-2">
          {provider.phone ? (
            <Button asChild><a href={`tel:${provider.phone.replace(/\s/g, "")}`}><Phone aria-hidden /> Call</a></Button>
          ) : null}
          {whatsapp ? (
            <Button asChild variant="green"><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> WhatsApp</a></Button>
          ) : null}
          {provider.email ? (
            <Button asChild variant="outline"><a href={`mailto:${provider.email}`}><Mail aria-hidden /> Email</a></Button>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <FavouriteButton kind="service" id={service.id} initial={saved} signedIn={Boolean(viewer)} />
        <ReportDialog targetKind="service" targetId={service.id} signedIn={Boolean(viewer)} variant="outline" />
      </div>
    </article>
  );
}
