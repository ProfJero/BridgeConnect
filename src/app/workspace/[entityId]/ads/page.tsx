import { PageHeader, Section } from "@/components/shared/page-header";
import { getCommunityOptions } from "@/features/locations/queries";
import { AdForm, AdList } from "@/features/workspace/components/ad-manager";
import { listEntityAds } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceAdsPage({ params }: PageProps<"/workspace/[entityId]/ads">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "advertising");
  const [ads, communities] = await Promise.all([listEntityAds(entityId), getCommunityOptions()]);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Advertising" description="Promote your organisation. Every ad is reviewed by DBI before it runs and is labelled “Sponsored”." />
      <Section title="Your advertisements"><AdList entityId={entityId} ads={ads} /></Section>
      <Section title="Create an advertisement">
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <AdForm entityId={entityId} communities={communities} defaultLink={`/directory/${ctx.entity.slug}`} />
        </div>
      </Section>
    </div>
  );
}
