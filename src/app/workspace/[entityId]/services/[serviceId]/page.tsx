import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { getCategories } from "@/features/marketplace/queries";
import { ServiceForm } from "@/features/workspace/components/listing-forms";
import { getEntityService } from "@/features/workspace/queries";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

export default async function EditServicePage({ params }: PageProps<"/workspace/[entityId]/services/[serviceId]">) {
  const { entityId, serviceId } = await params;
  if (!isUuid(serviceId)) notFound();
  await requireWorkspaceCapability(entityId, "services");
  const [service, categories] = await Promise.all([getEntityService(entityId, serviceId), getCategories("service")]);
  if (!service || service.status === "removed") notFound();
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Edit service" description={service.name} />
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <ServiceForm
          entityId={entityId}
          categories={categories}
          initial={{
            serviceId: service.id,
            name: service.name,
            categoryId: service.category_id ?? "",
            description: service.description ?? "",
            priceFrom: service.price_from ?? "",
            priceNote: service.price_note ?? "",
            serviceArea: service.service_area ?? "",
            status: service.status as "draft" | "active" | "archived",
          }}
        />
      </div>
    </div>
  );
}
