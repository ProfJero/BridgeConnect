import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UserAvatar } from "@/components/shared/avatars";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ConversationActions } from "@/features/messages/components/conversation-actions";
import { MessageThread } from "@/features/messages/components/message-thread";
import { getConversation, listMessages } from "@/features/messages/queries";
import { hasMembershipRole } from "@/lib/auth/permissions";
import { isUuid, requireWorkspaceCapability } from "@/lib/auth/session";

export default async function WorkspaceConversationPage({
  params,
}: PageProps<"/workspace/[entityId]/inbox/[conversationId]">) {
  const { entityId, conversationId } = await params;
  if (!isUuid(conversationId)) notFound();
  const ctx = await requireWorkspaceCapability(entityId, "messages");
  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.entity_id !== entityId) notFound();
  const messages = await listMessages(conversationId);
  const name = conversation.profiles?.display_name ?? "Resident";

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to inbox">
          <Link href={`/workspace/${entityId}/inbox`}><ArrowLeft aria-hidden /></Link>
        </Button>
        <UserAvatar name={name} path={conversation.profiles?.avatar_path} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          {conversation.subject ? <p className="truncate text-xs text-muted-foreground">{conversation.subject}</p> : null}
        </div>
        {conversation.status !== "open" ? <StatusBadge status={conversation.status} /> : null}
      </div>
      <MessageThread conversationId={conversationId} side="entity" messages={messages} canSend={ctx.entity.status === "active"} disabledReason="This workspace is read-only." />
      <ConversationActions
        conversationId={conversationId}
        status={conversation.status}
        side="entity"
        canBlock={hasMembershipRole(ctx.role, "manager")}
      />
    </div>
  );
}
