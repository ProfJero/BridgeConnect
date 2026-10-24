import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { getCategories } from "@/features/marketplace/queries";
import { EventForm } from "@/features/workspace/components/listing-forms";
import { getEntityEvent } from "@/features/workspace/queries";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

/** ISO timestamp → value for <input type="datetime-local"> in local time. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: PageProps<"/workspace/[entityId]/events/[eventId]">) {
  const { entityId, eventId } = await params;
  if (!isUuid(eventId)) notFound();
  const ctx = await requireWorkspaceCapability(entityId, "events");
  const event = await getEntityEvent(entityId, eventId);
  if (!event || event.status === "removed") notFound();
  const [categories, communities] = await Promise.all([getCategories("event"), getCommunityOptions()]);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Edit event" description={`${event.going_count} people going`} />
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <EventForm
          entityId={entityId}
          categories={categories}
          communities={communities}
          defaultCommunityId={ctx.entity.community_id}
          initial={{
            eventId: event.id,
            title: event.title,
            categoryId: event.category_id ?? "",
            communityId: event.community_id,
            description: event.description,
            isOnline: event.is_online,
            venue: event.venue ?? "",
            onlineUrl: event.online_url ?? "",
            startsAt: toLocalInput(event.starts_at),
            endsAt: toLocalInput(event.ends_at),
            capacity: event.capacity ?? "",
            coverPath: event.cover_path,
            status: event.status as "draft" | "published" | "cancelled",
          }}
        />
      </div>
    </div>
  );
}
