"use client";

import {
  BadgeCheck,
  Bell,
  Bike,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  House,
  LifeBuoy,
  Megaphone,
  MessageSquareText,
  Package,
  ShieldAlert,
  Siren,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "../actions";

const ICON: { prefix: string; icon: LucideIcon; tone: string }[] = [
  { prefix: "emergency", icon: Siren, tone: "bg-destructive-soft text-destructive" },
  { prefix: "moderation", icon: ShieldAlert, tone: "bg-destructive-soft text-destructive" },
  { prefix: "order", icon: Package, tone: "bg-primary-soft text-primary-soft-foreground" },
  { prefix: "trip", icon: Bike, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { prefix: "rider", icon: Bike, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { prefix: "booking", icon: CalendarCheck, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { prefix: "job", icon: Briefcase, tone: "bg-primary-soft text-primary-soft-foreground" },
  { prefix: "event", icon: CalendarDays, tone: "bg-destructive-soft text-destructive-soft-foreground" },
  { prefix: "follow", icon: Megaphone, tone: "bg-warning-soft text-warning-soft-foreground" },
  { prefix: "message", icon: MessageSquareText, tone: "bg-primary-soft text-primary-soft-foreground" },
  { prefix: "review", icon: Star, tone: "bg-warning-soft text-warning-soft-foreground" },
  { prefix: "rental", icon: House, tone: "bg-warning-soft text-warning-soft-foreground" },
  { prefix: "verification", icon: BadgeCheck, tone: "bg-brand-green-soft text-brand-green-soft-foreground" },
  { prefix: "support", icon: LifeBuoy, tone: "bg-primary-soft text-primary-soft-foreground" },
];
function iconFor(type: string) {
  return ICON.find((i) => type.startsWith(i.prefix)) ?? { icon: Bell, tone: "bg-primary-soft text-primary-soft-foreground" };
}

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
      <ul className="stagger divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((n) => {
          const { icon: Icon, tone } = iconFor(n.type);
          const content = (
            <>
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone)}>
                <Icon aria-hidden className="size-5" />
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
