import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { EventForm } from "@/features/workspace/components/listing-forms";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function NewEventPage({ params }: PageProps<"/workspace/[entityId]/events/new">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "events");
  const [categories, communities] = await Promise.all([getCategories("event"), getCommunityOptions()]);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Create event" />
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <EventForm entityId={entityId} categories={categories} communities={communities} defaultCommunityId={ctx.entity.community_id} />
      </div>
    </div>
  );
}
