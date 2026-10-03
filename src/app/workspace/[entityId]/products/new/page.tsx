import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/features/marketplace/queries";
import { ProductForm } from "@/features/workspace/components/listing-forms";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function NewProductPage({ params }: PageProps<"/workspace/[entityId]/products/new">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "products");
  const categories = await getCategories("product");
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Add product" />
      <div className="rounded-xl border bg-card p-4 sm:p-6"><ProductForm entityId={entityId} categories={categories} /></div>
    </div>
  );
}
