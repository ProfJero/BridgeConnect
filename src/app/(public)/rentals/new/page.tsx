import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { RentalForm } from "@/features/rentals/components/rental-form";
import { requireActiveViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "List a property", robots: noIndex };

export default async function NewRentalPage() {
  const viewer = await requireActiveViewer("/rentals/new");
  const communities = await getCommunityOptions();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="List a property" description="Rooms, houses, shops, offices or land — free to list." />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <RentalForm userId={viewer.id} communities={communities} defaultCommunityId={viewer.profile.home_community_id ?? undefined} />
      </div>
    </div>
  );
}
