import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { RiderProfileForm } from "@/features/mobility/components/rider-app";
import { getMyRiderProfile } from "@/features/mobility/queries";
import { requireActiveViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "My rider profile", robots: noIndex };

export default async function RiderProfilePage() {
  const viewer = await requireActiveViewer("/rider/profile");
  const [profile, communities] = await Promise.all([getMyRiderProfile(viewer.id), getCommunityOptions()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={profile ? "My rider profile" : "Register as a rider"} description="Your vehicle, the services you offer and how customers reach you." />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <RiderProfileForm
          communities={communities}
          initial={profile ? {
            vehicleType: profile.vehicle_type,
            vehicleDescription: profile.vehicle_description,
            plateNumber: profile.plate_number ?? "",
            offersRides: profile.offers_rides,
            offersDelivery: profile.offers_delivery,
            communityId: profile.community_id,
            serviceArea: profile.service_area ?? "",
            phone: profile.phone,
            whatsapp: profile.whatsapp ?? "",
            bio: profile.bio ?? "",
          } : undefined}
        />
      </div>
    </div>
  );
}
