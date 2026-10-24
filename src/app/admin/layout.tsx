import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { UserAvatar } from "@/components/shared/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { ADMIN_NAV } from "@/features/admin/nav";
import { canAnywhere } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";
import { humanize } from "@/lib/format";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · DBI Administration" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireAdminPermission("admin.access");
  const allowed = ADMIN_NAV.flatMap((g) => g.items).filter((i) => canAnywhere(viewer.grants, i.permission)).map((i) => i.href);
  const scopes = [...new Set(viewer.grants.map((g) => g.scope))];

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-5 p-4">
          <div className="space-y-1">
            <Link href="/admin" aria-label="Administration home"><Logo /></Link>
            <Badge variant="soft" className="ml-[42px]">DBI Administration</Badge>
          </div>
          <details className="lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold">Menu</summary>
            <div className="pt-3"><AdminNav allowed={allowed} /></div>
          </details>
          <div className="hidden lg:block"><AdminNav allowed={allowed} /></div>
          <div className="mt-auto hidden space-y-3 lg:block">
            <div className="flex items-center gap-2 px-1">
              <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} className="size-8" />
              <div className="min-w-0 text-xs">
                <p className="truncate font-semibold">{viewer.profile.display_name}</p>
                <p className="text-muted-foreground">{scopes.map(humanize).join(", ")} scope</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full"><Link href="/">Back to BridgeConnect</Link></Button>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
