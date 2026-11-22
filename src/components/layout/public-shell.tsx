import { MessageSquareText, Search } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getMyUnreadMessageCount } from "@/features/messages/queries";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { getViewer } from "@/lib/auth/session";

import { AccountMenu } from "./account-menu";
import { EmergencyBanner } from "./emergency-banner";
import { NotificationBell } from "./notification-bell";
import { BackButton, DesktopRail, MobileTabBar, RAIL_COOKIE } from "./public-nav";

/**
 * App shell: compact top bar, left rail on desktop, five-tab bar on phones.
 * There is deliberately no website-style footer — legal/help links live under
 * Profile → Settings and Help & support.
 */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const [unread, unreadMessages] = viewer
    ? await Promise.all([getUnreadNotificationCount(), getMyUnreadMessageCount()])
    : [0, 0];
  const railCollapsed = (await cookies()).get(RAIL_COOKIE)?.value === "collapsed";

  return (
    <div className="flex min-h-dvh bg-background">
      <DesktopRail signedIn={Boolean(viewer)} initialCollapsed={railCollapsed} dashboards={Boolean(viewer)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <React.Suspense fallback={null}>
          <EmergencyBanner communityId={viewer?.profile.home_community_id ?? null} />
        </React.Suspense>
        <header className="sticky top-0 z-30 border-b bg-card/85 pt-safe backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-1.5 px-3 sm:px-4 lg:h-16 lg:px-6">
            <BackButton />
            <Link href="/" aria-label="BridgeConnect home" className="shrink-0 lg:hidden">
              <Logo markClassName="size-8" wordmarkClassName={viewer ? "max-[400px]:hidden" : undefined} />
            </Link>
            <form action="/search" role="search" className="mx-auto hidden w-full max-w-lg md:block">
              <label className="relative block">
                <span className="sr-only">Search BridgeConnect</span>
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  type="search"
                  placeholder="Search businesses, jobs, products, rentals…"
                  className="h-10 w-full rounded-full border bg-muted/60 pr-4 pl-10 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-[3px] focus:ring-ring/25"
                />
              </label>
            </form>
            <div className="ml-auto flex items-center gap-0.5 md:ml-0">
              <Button asChild variant="ghost" size="icon" className="md:hidden">
                <Link href="/search" aria-label="Search">
                  <Search aria-hidden className="size-5" />
                </Link>
              </Button>
              {viewer ? (
                <>
                  <Button asChild variant="ghost" size="icon" className="relative">
                    <Link href="/messages" aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : "Messages"}>
                      <MessageSquareText aria-hidden className="size-5" />
                      {unreadMessages ? (
                        <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      ) : null}
                    </Link>
                  </Button>
                  <NotificationBell userId={viewer.id} initialUnread={unread} />
                  <AccountMenu
                    displayName={viewer.profile.display_name}
                    avatarPath={viewer.profile.avatar_path}
                    isAdmin={viewer.isAdmin}
                    workspaces={viewer.workspaces.map((w) => ({ entityId: w.entityId, name: w.name }))}
                  />
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <Link href="/sign-up">Join</Link>
                  </Button>
                  <Button asChild size="sm" className="ml-1 rounded-full px-4">
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>
        {viewer && !viewer.isActive ? (
          <div role="status" className="bg-destructive-soft px-4 py-2 text-center text-sm text-destructive-soft-foreground">
            Your account is suspended. You can browse BridgeConnect but cannot post, order or apply.
          </div>
        ) : null}
        <main id="main" className="animate-page mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
