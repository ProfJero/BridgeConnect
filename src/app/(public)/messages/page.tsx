import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { listMyConversations } from "@/features/messages/queries";
import { requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Messages", robots: noIndex };

export default async function MessagesPage() {
  const viewer = await requireViewer("/messages");
  const conversations = await listMyConversations(viewer.id);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Messages" description="Your conversations with verified businesses and organisations." />
      <ConversationList
        conversations={conversations}
        side="user"
        hrefBase="/messages"
        emptyDescription="Tap “Message” on any business, service or product page to start a conversation."
      />
    </div>
  );
}
