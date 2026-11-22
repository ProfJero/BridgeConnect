import { ArrowLeftRight, Home } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { LogoMark } from "@/components/brand/logo";
import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { UserAvatar } from "@/components/shared/avatars";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { ADMIN_NAV } from "@/features/admin/nav";
import { canAnywhere } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";
import { humanize } from "@/lib/format";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration" }, robots: { index: false } };

const COOKIE = "bc-admin-rail";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireAdminPermission("admin.access");
  const allowed = ADMIN_NAV.flatMap((g) => g.items).filter((i) => canAnywhere(viewer.grants, i.permission)).map((i) => i.href);
  const scopes = [...new Set(viewer.grants.map((g) => g.scope))];
  const collapsed = (await cookies()).get(COOKIE)?.value === "collapsed";

  return (
    <DashboardFrame
      cookieName={COOKIE}
      initialCollapsed={collapsed}
      title="Administration"
      brand={
        <Link href="/admin" aria-label="Administration home" className="flex items-center gap-3">
          <span className="shrink-0 rounded-xl bg-white p-1 shadow-sm"><LogoMark className="size-8" /></span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-extrabold">Administration</span>
            <span className="block truncate text-xs text-nav-muted">BridgeConnect · {scopes.map(humanize).join(", ")}</span>
          </span>
        </Link>
      }
      nav={<AdminNav allowed={allowed} />}
      footer={
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} className="size-9 border border-white/30" />
            <div className="min-w-0 text-xs">
              <p className="truncate font-semibold">{viewer.profile.display_name}</p>
              <p className="text-nav-muted">{scopes.map(humanize).join(", ")} scope</p>
            </div>
          </div>
          <Link href="/" className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-medium hover:bg-white/20">
            <ArrowLeftRight aria-hidden className="size-4" /> Back to BridgeConnect
          </Link>
        </div>
      }
      topRight={
        <Button asChild variant="ghost" size="icon" aria-label="BridgeConnect home"><Link href="/"><Home aria-hidden className="size-5" /></Link></Button>
      }
    >
      {children}
    </DashboardFrame>
  );
}
