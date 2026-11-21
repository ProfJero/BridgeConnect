import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { ConversationList } from "@/features/messages/components/conversation-list";
import { listEntityConversations } from "@/features/messages/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Done" },
  { value: "blocked", label: "Blocked" },
] as const;

export default async function WorkspaceInboxPage({ params, searchParams }: PageProps<"/workspace/[entityId]/inbox">) {
  const { entityId } = await params;
  const sp = await searchParams;
  await requireWorkspaceCapability(entityId, "messages");
  const status = FILTERS.find((f) => f.value === sp.status)?.value ?? "open";
  const conversations = await listEntityConversations(entityId, status);
  const base = `/workspace/${entityId}/inbox`;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Inbox" description="Questions and enquiries from residents. Replies are sent as your organisation." />
      <nav aria-label="Filter conversations" className="flex gap-1 rounded-xl border bg-muted p-1 sm:w-fit">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`${base}?status=${f.value}`}
            aria-current={status === f.value ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium text-muted-foreground",
              status === f.value && "bg-card text-foreground shadow-xs",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <ConversationList
        conversations={conversations}
        side="entity"
        hrefBase={base}
        emptyDescription="When residents message you from your public page, products or services, it appears here."
      />
    </div>
  );
}
