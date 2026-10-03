import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { WorkspaceNav } from "@/features/workspace/components/workspace-nav";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { WORKSPACE_MODULES } from "@/features/workspace/modules";
import { hasMembershipRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/auth/session";
import { humanize } from "@/lib/format";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/workspace/[entityId]">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  const segments = WORKSPACE_MODULES.filter((m) =>
    m.capability ? ctx.can(m.capability) : hasMembershipRole(ctx.role, m.minRole ?? "member"),
  ).map((m) => m.segment);
  const ws = ctx.viewer.workspaces.map((w) => ({ entityId: w.entityId, name: w.name, logoPath: w.logoPath }));

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-3 p-3">
          <Link href="/" className="hidden px-2 pt-1 lg:block" aria-label="BridgeConnect home"><Logo /></Link>
          <WorkspaceSwitcher current={{ entityId, name: ctx.entity.name, logoPath: ctx.entity.logo_path }} workspaces={ws} />
          <WorkspaceNav entityId={entityId} segments={segments} />
          <div className="mt-auto hidden space-y-2 px-2 text-xs text-muted-foreground lg:block">
            <p>Your role: <strong className="text-foreground">{humanize(ctx.role)}</strong></p>
            {ctx.entity.status === "active" ? (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/directory/${ctx.entity.slug}`}><ExternalLink aria-hidden /> View public listing</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-8">
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
      </main>
    </div>
  );
}
