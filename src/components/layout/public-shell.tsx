import { Search, Siren } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { getViewer } from "@/lib/auth/session";

import { AccountMenu } from "./account-menu";
import { EmergencyBanner } from "./emergency-banner";
import { NotificationBell } from "./notification-bell";
import { DesktopNav, MobileTabBar } from "./public-nav";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const unread = viewer ? await getUnreadNotificationCount() : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <React.Suspense fallback={null}>
        <EmergencyBanner communityId={viewer?.profile.home_community_id ?? null} />
      </React.Suspense>
      <header className="sticky top-0 z-30 border-b bg-card/95 pt-safe backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="BridgeConnect home" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex-1 lg:flex-none" />
          <DesktopNav />
          <div className="hidden flex-1 lg:block" />
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon">
              <Link href="/search" aria-label="Search">
                <Search aria-hidden className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Link href="/emergency" aria-label="Emergency information">
                <Siren aria-hidden className="size-5" />
              </Link>
            </Button>
            {viewer ? (
              <>
                <NotificationBell userId={viewer.id} initialUnread={unread} />
                <AccountMenu
                  displayName={viewer.profile.display_name}
                  avatarPath={viewer.profile.avatar_path}
                  isAdmin={viewer.isAdmin}
                  workspaces={viewer.workspaces.map((w) => ({ entityId: w.entityId, name: w.name }))}
                />
              </>
            ) : (
              <Button asChild size="sm" className="ml-1">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {viewer && !viewer.isActive ? (
        <div role="status" className="bg-destructive-soft px-4 py-2 text-center text-sm text-destructive-soft-foreground">
          Your account is suspended. You can browse BridgeConnect but cannot post, order or apply.
        </div>
      ) : null}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:pb-12">
        {children}
      </main>
      <footer className="hidden border-t bg-card lg:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <Logo showTagline />
          <p>© {new Date().getFullYear()} Digital Bridge Initiative</p>
        </div>
      </footer>
      <MobileTabBar />
    </div>
  );
}
