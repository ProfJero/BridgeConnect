import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/features/marketplace/queries";
import { ProductForm } from "@/features/workspace/components/listing-forms";
import { getEntityProduct } from "@/features/workspace/queries";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

export default async function EditProductPage({ params }: PageProps<"/workspace/[entityId]/products/[productId]">) {
  const { entityId, productId } = await params;
  if (!isUuid(productId)) notFound();
  await requireWorkspaceCapability(entityId, "products");
  const [product, categories] = await Promise.all([getEntityProduct(entityId, productId), getCategories("product")]);
  if (!product || product.status === "removed") notFound();
  const images = [...product.product_media]
    .sort((a, b) => a.position - b.position)
    .flatMap((m) => (m.media_assets ? [{ id: m.media_id, path: m.media_assets.storage_path }] : []));
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Edit product" description={product.name} />
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <ProductForm
          entityId={entityId}
          categories={categories}
          initialImages={images}
          initial={{
            productId: product.id,
            name: product.name,
            categoryId: product.category_id ?? "",
            description: product.description ?? "",
            price: Number(product.price),
            unit: product.unit ?? "",
            stockQuantity: product.stock_quantity ?? "",
            status: product.status as "draft" | "active" | "out_of_stock" | "archived",
          }}
        />
      </div>
    </div>
  );
}
