import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/features/marketplace/queries";
import { ServiceForm } from "@/features/workspace/components/listing-forms";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function NewServicePage({ params }: PageProps<"/workspace/[entityId]/services/new">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "services");
  const categories = await getCategories("service");
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Add service" />
      <div className="rounded-xl border bg-card p-4 sm:p-6"><ServiceForm entityId={entityId} categories={categories} /></div>
    </div>
  );
}
