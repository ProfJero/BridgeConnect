import { CheckCircle2, XCircle } from "lucide-react";

import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { WORKSPACE_MODULES } from "@/features/workspace/modules";
import { getWorkspace } from "@/lib/auth/session";
import { humanize } from "@/lib/format";

export default async function WorkspaceSettingsPage({ params }: PageProps<"/workspace/[entityId]/settings">) {
  const { entityId } = await params;
  const ctx = await getWorkspace(entityId);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      <Card>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Verified name:</span> {ctx.entity.name}</p>
          <p><span className="text-muted-foreground">Type:</span> {ENTITY_TYPE_LABEL[ctx.entity.entity_type]}</p>
          <p><span className="text-muted-foreground">Sector:</span> {SECTOR_LABEL[ctx.entity.sector]}</p>
          <p className="flex items-center gap-2"><span className="text-muted-foreground">Status:</span> <StatusBadge status={ctx.entity.status} /></p>
          <p><span className="text-muted-foreground">Your role:</span> {humanize(ctx.role)}</p>
        </CardContent>
      </Card>
      <Section title="Modules">
        <ul className="grid gap-2 sm:grid-cols-2">
          {WORKSPACE_MODULES.filter((m) => m.capability).map((m) => {
            const enabled = ctx.capabilities.includes(m.capability!);
            return (
              <li key={m.segment} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                {enabled ? <CheckCircle2 aria-hidden className="size-4 text-brand-green" /> : <XCircle aria-hidden className="size-4 text-muted-foreground" />}
                {m.label}
                <span className="ml-auto text-xs text-muted-foreground">{enabled ? "Enabled" : "Not available"}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">Modules depend on your organisation type. To change your verified name, type or community, or to request a module, contact Digital Bridge Initiative.</p>
      </Section>
    </div>
  );
}
