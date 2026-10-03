import { PageHeader } from "@/components/shared/page-header";
import { EntityProfileForm } from "@/features/workspace/components/entity-profile-form";
import { getEntityForEdit } from "@/features/workspace/queries";
import { requireWorkspaceRole } from "@/lib/auth/session";

export default async function WorkspaceProfilePage({ params }: PageProps<"/workspace/[entityId]/profile">) {
  const { entityId } = await params;
  await requireWorkspaceRole(entityId, "manager");
  const e = await getEntityForEdit(entityId);
  const biz = e.business_profiles;
  const org = e.organisation_profiles;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Public profile" description="How your organisation appears in the BridgeConnect directory." />
      <EntityProfileForm
        initial={{
          entityId,
          name: e.name,
          isBusiness: e.entity_type === "business",
          tagline: e.tagline ?? "",
          description: e.description ?? "",
          address: e.address ?? "",
          phone: e.phone ?? "",
          whatsapp: e.whatsapp ?? "",
          email: e.email ?? "",
          website: e.website ?? "",
          logoPath: e.logo_path,
          coverPath: e.cover_path,
          openingHours: (e.opening_hours as never) ?? null,
          yearEstablished: biz?.year_established ?? org?.year_established ?? "",
          deliveryAvailable: biz?.delivery_available ?? false,
          acceptsMobileMoney: biz?.accepts_mobile_money ?? false,
          mission: org?.mission ?? "",
          beneficiaries: org?.beneficiaries ?? "",
        }}
      />
    </div>
  );
}
