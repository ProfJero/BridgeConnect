import { BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EntityCard } from "@/components/cards/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listFollowing } from "@/features/follows/queries";
import { requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Following", robots: noIndex };

export default async function FollowingPage() {
  const viewer = await requireViewer("/following");
  const entities = await listFollowing(viewer.id);
  return (
    <div className="space-y-5">
      <PageHeader title="Following" description="Organisations you follow. You're notified when they post updates or events." />
      {entities.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="You're not following anyone yet"
          description="Follow schools, clinics, NGOs and businesses to get their updates."
          action={<Button asChild><Link href="/explore">Explore the directory</Link></Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((e) => <EntityCard key={e.id} entity={e} />)}
        </div>
      )}
    </div>
  );
}
