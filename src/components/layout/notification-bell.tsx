"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Unread badge that updates live via Supabase Realtime (refreshing the
 * server-computed count). RLS restricts the
 * subscription to the viewer's own notification rows.
 */
export function NotificationBell({ userId, initialUnread: unread }: { userId: string; initialUnread: number }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { title?: string; type?: string };
          if (row.title) {
            if (row.type === "emergency.alert") toast.error(row.title, { duration: 15000 });
            else toast(row.title);
          }
          // Re-render server components so the badge (and any open list) is exact.
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
