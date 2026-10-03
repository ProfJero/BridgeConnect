import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreatePostForm } from "@/features/community/components/create-post-form";
import { getCommunityOptions } from "@/features/locations/queries";
import { canUseCapability, type EntityCapability } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create a post" };

export default async function CreatePostPage() {
  const viewer = await requireViewer("/community/new");
  if (!viewer.isActive) {
    return (
      <Alert variant="destructive"><AlertDescription>Your account is suspended, so you can&apos;t post right now.</AlertDescription></Alert>
    );
  }
  const communities = await getCommunityOptions();

  // Workspaces where the viewer may post as the entity (UX filter; RLS enforces).
  const supabase = await createClient();
  const active = viewer.workspaces.filter((w) => w.status === "active");
  const eligible = (
    await Promise.all(
      active.map(async (w) => {
        const [{ data: caps }, { data: entity }] = await Promise.all([
          supabase.rpc("entity_capabilities", { p_entity: w.entityId }),
          supabase.from("entities").select("community_id").eq("id", w.entityId).maybeSingle(),
        ]);
        return canUseCapability((caps ?? []) as EntityCapability[], w.role, "posts") && entity
          ? [{ entityId: w.entityId, name: w.name, communityId: entity.community_id }]
          : [];
      }),
    )
  ).flat();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Create a post" description="Share news, ask a question or recommend something to your community." />
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <CreatePostForm
          userId={viewer.id}
          communities={communities}
          defaultCommunityId={viewer.profile.home_community_id ?? undefined}
          workspaces={eligible}
        />
      </div>
    </div>
  );
}
