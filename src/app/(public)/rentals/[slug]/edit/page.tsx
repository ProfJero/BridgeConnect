import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { RentalForm } from "@/features/rentals/components/rental-form";
import { getRentalBySlug } from "@/features/rentals/queries";
import { requireActiveViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Edit listing", robots: noIndex };

export default async function EditRentalPage({ params }: PageProps<"/rentals/[slug]/edit">) {
  const { slug } = await params;
  const viewer = await requireActiveViewer(`/rentals/${slug}/edit`);
  const [rental, communities] = await Promise.all([getRentalBySlug(slug), getCommunityOptions()]);
  if (!rental || rental.owner_id !== viewer.id || rental.status === "removed") notFound();
  const images = [...(rental.rental_media ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((m) => (m.media_assets ? [{ id: m.media_assets.id, path: m.media_assets.storage_path }] : []));
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Edit listing" description={rental.title} />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <RentalForm
          userId={viewer.id}
          communities={communities}
          initial={{
            rentalId: rental.id,
            communityId: rental.community_id,
            rentalType: rental.rental_type,
            title: rental.title,
            description: rental.description,
            price: Number(rental.price),
            period: rental.period,
            advanceMonths: rental.advance_months ?? "",
            bedrooms: rental.bedrooms ?? "",
            bathrooms: rental.bathrooms ?? "",
            furnished: rental.furnished,
            amenities: rental.amenities,
            locationNote: rental.location_note ?? "",
            contactPhone: rental.contact_phone,
            whatsapp: rental.whatsapp ?? "",
            availableFrom: rental.available_from ?? "",
            status: rental.status as "draft" | "available" | "rented" | "archived",
            images,
          }}
        />
      </div>
    </div>
  );
}
