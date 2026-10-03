import { Bell } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { NotificationList } from "@/features/notifications/components/notification-list";
import { getUnreadNotificationCount, listNotifications } from "@/features/notifications/queries";
import { requireViewer } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireViewer("/notifications");
  const page = parsePage((await searchParams).page);
  const [{ items, total }, unread] = await Promise.all([listNotifications(page), getUnreadNotificationCount()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Notifications" description={unread ? `${unread} unread` : "You're all caught up."} />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="Updates about your orders, applications, posts and community alerts will appear here." />
      ) : (
        <NotificationList items={items} unread={unread} />
      )}
      <Pagination page={page} pageSize={20} total={total} basePath="/notifications" />
    </div>
  );
}
