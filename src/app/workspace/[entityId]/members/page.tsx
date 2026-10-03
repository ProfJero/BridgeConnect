import { PageHeader } from "@/components/shared/page-header";
import { MemberManager } from "@/features/workspace/components/member-manager";
import { listEntityMembers } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceMembersPage({ params }: PageProps<"/workspace/[entityId]/members">) {
  const { entityId } = await params;
  const ctx = await requireWorkspaceCapability(entityId, "members");
  const members = await listEntityMembers(entityId);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Members" description="People who can help manage this workspace." />
      <MemberManager entityId={entityId} members={members} myRole={ctx.role} myUserId={ctx.viewer.id} />
    </div>
  );
}
