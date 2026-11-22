import { PageHeader } from "@/components/shared/page-header";
import { EntityProfileForm } from "@/features/workspace/components/entity-profile-form";
import { getEntityForEdit } from "@/features/workspace/queries";
import { requireWorkspaceRole } from "@/lib/auth/session";
import { cleanSocialLinks } from "@/lib/contact";

export default async function WorkspaceProfilePage({ params }: PageProps<"/workspace/[entityId]/profile">) {
  const { entityId } = await params;
  await requireWorkspaceRole(entityId, "manager");
  const e = await getEntityForEdit(entityId);
  const biz = e.business_profiles;
  const org = e.organisation_profiles;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Business profile" description="Update your contact details, WhatsApp, social media, location, logo, cover and opening hours at any time." />
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
          socialLinks: cleanSocialLinks(e.social_links),
          location: e.latitude != null && e.longitude != null ? { lat: Number(e.latitude), lng: Number(e.longitude) } : null,
        }}
      />
    </div>
  );
}
