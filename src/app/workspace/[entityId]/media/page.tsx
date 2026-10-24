import { PageHeader } from "@/components/shared/page-header";
import { MediaGallery } from "@/features/workspace/components/media-gallery";
import { listEntityMedia } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceMediaPage({ params }: PageProps<"/workspace/[entityId]/media">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "media");
  const items = await listEntityMedia(entityId);
  return (
    <div className="space-y-5">
      <PageHeader title="Media library" description="Images used across your profile, products, events and ads." />
      <MediaGallery entityId={entityId} items={items} />
    </div>
  );
}
