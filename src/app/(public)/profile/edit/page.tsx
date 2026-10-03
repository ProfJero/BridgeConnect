import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCommunityOptions } from "@/features/locations/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const viewer = await requireViewer("/profile/edit");
  const communities = await getCommunityOptions();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Edit profile" />
      {!viewer.isActive ? (
        <Alert variant="destructive"><AlertDescription>Suspended accounts cannot change their profile.</AlertDescription></Alert>
      ) : (
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <ProfileForm
            userId={viewer.id}
            communities={communities}
            initial={{
              displayName: viewer.profile.display_name,
              username: viewer.profile.username ?? "",
              bio: viewer.profile.bio ?? "",
              homeCommunityId: viewer.profile.home_community_id ?? "",
              avatarPath: viewer.profile.avatar_path,
            }}
          />
        </div>
      )}
    </div>
  );
}
