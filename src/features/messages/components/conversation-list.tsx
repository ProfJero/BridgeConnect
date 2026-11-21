import { Inbox } from "lucide-react";
import Link from "next/link";

import { EntityAvatar, UserAvatar } from "@/components/shared/avatars";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { isUnread, type ConversationData } from "../queries";

/** Inbox list. `side` decides whose name/avatar is shown and what counts as unread. */
export function ConversationList({
  conversations,
  side,
  hrefBase,
  activeId,
  emptyDescription,
}: {
  conversations: ConversationData[];
  side: "user" | "entity";
  hrefBase: string;
  activeId?: string;
  emptyDescription: string;
}) {
  if (conversations.length === 0) {
    return <EmptyState icon={Inbox} title="No conversations yet" description={emptyDescription} />;
  }
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {conversations.map((c) => {
        const unread = isUnread(c, side);
        const name = side === "user" ? c.entities?.name ?? "Organisation" : c.profiles?.display_name ?? "Resident";
        return (
          <li key={c.id}>
            <Link
              href={`${hrefBase}/${c.id}`}
              aria-current={activeId === c.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 p-3 transition-colors hover:bg-accent active:bg-accent",
                activeId === c.id && "bg-primary-soft/60",
              )}
            >
              {side === "user" ? (
                <EntityAvatar name={name} path={c.entities?.logo_path} className="size-11" />
              ) : (
                <UserAvatar name={name} path={c.profiles?.avatar_path} className="size-11" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate", unread ? "font-bold" : "font-medium")}>{name}</span>
                  <time dateTime={c.last_message_at} className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(c.last_message_at)}
                  </time>
                </span>
                {c.subject ? <span className="block truncate text-xs font-medium text-muted-foreground">{c.subject}</span> : null}
                <span className={cn("block truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
                  {c.last_sender_side === (side === "user" ? "user" : "entity") ? "You: " : ""}
                  {c.last_message_preview}
                </span>
              </span>
              {unread ? (
                <span className="size-2.5 shrink-0 rounded-full bg-primary">
                  <span className="sr-only">Unread</span>
                </span>
              ) : c.status !== "open" ? (
                <StatusBadge status={c.status} />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
