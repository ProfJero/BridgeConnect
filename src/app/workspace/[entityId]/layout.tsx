import { ArrowLeftRight, ExternalLink, Home } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { DashboardFrame } from "@/components/dashboard/dashboard-frame";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { countPendingBookings } from "@/features/bookings/queries";
import { getEntityUnreadMessageCount } from "@/features/messages/queries";
import { WorkspaceNav } from "@/features/workspace/components/workspace-nav";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { WORKSPACE_MODULES } from "@/features/workspace/modules";
import { hasMembershipRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { robots: noIndex };

const COOKIE = "bc-ws-rail";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/workspace/[entityId]">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  const segments = WORKSPACE_MODULES.filter((m) =>
    m.capability ? ctx.can(m.capability) : hasMembershipRole(ctx.role, m.minRole ?? "member"),
  ).map((m) => m.segment);
  const ws = ctx.viewer.workspaces.map((w) => ({ entityId: w.entityId, name: w.name, logoPath: w.logoPath }));
  const [unread, pendingBookings] = await Promise.all([
    ctx.can("messages") ? getEntityUnreadMessageCount(entityId) : 0,
    ctx.can("bookings") ? countPendingBookings(entityId) : 0,
  ]);
  const collapsed = (await cookies()).get(COOKIE)?.value === "collapsed";

  return (
    <DashboardFrame
      cookieName={COOKIE}
      initialCollapsed={collapsed}
      title={ctx.entity.name}
      brand={<WorkspaceSwitcher current={{ entityId, name: ctx.entity.name, logoPath: ctx.entity.logo_path }} workspaces={ws} />}
      nav={<WorkspaceNav entityId={entityId} segments={segments} badges={{ inbox: unread, bookings: pendingBookings }} />}
      footer={
        <div className="space-y-2 text-xs">
          <p className="text-nav-muted">Your role: <strong className="text-nav-fg">{humanize(ctx.role)}</strong></p>
          {ctx.entity.status === "active" ? (
            <Link href={`/directory/${ctx.entity.slug}`} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-sm font-medium hover:bg-white/20">
              <ExternalLink aria-hidden className="size-4" /> View public page
            </Link>
          ) : null}
          <Link href="/dashboards" className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm text-nav-muted hover:bg-white/10 hover:text-nav-fg">
            <ArrowLeftRight aria-hidden className="size-4" /> All my dashboards
          </Link>
        </div>
      }
      topRight={
        <Button asChild variant="ghost" size="icon" aria-label="BridgeConnect home"><Link href="/"><Home aria-hidden className="size-5" /></Link></Button>
      }
    >
      {ctx.entity.status !== "active" ? (
        <Alert variant="destructive">
          <AlertDescription>
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ctx.entity.status} /> This workspace is read-only and hidden from the public.
              {ctx.entity.status_reason ? ` Reason: ${ctx.entity.status_reason}` : ""} Contact DBI support to resolve this.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}
      {children}
    </DashboardFrame>
  );
}
