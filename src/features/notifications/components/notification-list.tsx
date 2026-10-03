"use client";

import { Bell, Check, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "../actions";

type Item = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationList({ items, unread }: { items: Item[]; unread: number }) {
  const { pending, run } = useServerAction();
  return (
    <div className="space-y-3">
      {unread > 0 ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(markAllNotificationsReadAction)}>
            <Check aria-hidden /> Mark all as read
          </Button>
        </div>
      ) : null}
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((n) => {
          const content = (
            <>
              <span className={cn("mt-1 flex size-8 shrink-0 items-center justify-center rounded-full", n.type.startsWith("emergency") ? "bg-destructive-soft text-destructive" : "bg-primary-soft text-primary-soft-foreground")}>
                <Bell aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                {n.body ? <span className="block text-sm text-muted-foreground">{n.body}</span> : null}
                <span className="block text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
              </span>
              {!n.read_at ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary"><span className="sr-only">Unread</span></span> : null}
            </>
          );
          return (
            <li key={n.id} className={cn("flex items-start gap-1 pr-2", !n.read_at && "bg-primary-soft/40")}>
              {n.link ? (
                <Link href={n.link} onClick={() => !n.read_at && void markNotificationReadAction(n.id)} className="flex flex-1 items-start gap-3 p-4 hover:bg-accent/50">
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={() => !n.read_at && run(() => markNotificationReadAction(n.id))} className="flex flex-1 items-start gap-3 p-4 text-left hover:bg-accent/50">
                  {content}
                </button>
              )}
              <Button variant="ghost" size="icon-sm" className="mt-3" aria-label="Delete notification" disabled={pending} onClick={() => run(() => deleteNotificationAction(n.id))}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
