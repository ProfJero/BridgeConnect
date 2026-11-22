import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityAvatar } from "@/components/shared/avatars";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ConversationActions } from "@/features/messages/components/conversation-actions";
import { MessageThread } from "@/features/messages/components/message-thread";
import { getConversation, listMessages } from "@/features/messages/queries";
import { isUuid, requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Conversation", robots: noIndex };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await requireViewer(`/messages/${id}`);
  const conversation = await getConversation(id);
  // RLS returns entity-side threads to members too; this page is the resident view only.
  if (!conversation || conversation.user_id !== viewer.id) notFound();
  const messages = await listMessages(id);
  const entity = conversation.entities;
  const blocked = conversation.status === "blocked";

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        {entity ? (
          <Link href={`/directory/${entity.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
            <EntityAvatar name={entity.name} path={entity.logo_path} className="size-10" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate font-semibold">{entity.name} <VerifiedBadge compact /></span>
              {conversation.subject ? <span className="block truncate text-xs text-muted-foreground">{conversation.subject}</span> : null}
            </span>
          </Link>
        ) : null}
        {conversation.status !== "open" ? <StatusBadge status={conversation.status} /> : null}
      </div>
      <MessageThread
        conversationId={id}
        side="user"
        messages={messages}
        canSend={viewer.isActive && !blocked}
        disabledReason={blocked ? "This organisation is no longer accepting messages from you." : "Your account is suspended."}
      />
      {!blocked ? <ConversationActions conversationId={id} status={conversation.status} side="user" canBlock={false} /> : null}
    </div>
  );
}
