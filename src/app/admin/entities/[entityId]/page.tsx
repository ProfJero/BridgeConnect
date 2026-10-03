import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setEntityStatusAction } from "@/features/admin/actions";
import { CapabilityToggles } from "@/features/admin/components/capability-toggles";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { getAdminEntity } from "@/features/admin/queries";
import { ENTITY_TYPE_LABEL, SECTOR_LABEL } from "@/features/directory/constants";
import { canAnywhere } from "@/lib/auth/permissions";
import { isUuid, requireAdminPermission } from "@/lib/auth/session";
import { formatDate, humanize } from "@/lib/format";
import { Constants } from "@/types/database";

export default async function AdminEntityPage({ params }: PageProps<"/admin/entities/[entityId]">) {
  const { entityId } = await params;
  if (!isUuid(entityId)) notFound();
  const viewer = await requireAdminPermission("entities.read_all");
  const { entity, overrides, defaults, members, capabilities } = await getAdminEntity(entityId);
  if (!entity) notFound();
  const canManage = canAnywhere(viewer.grants, "entities.manage");
  const typeDefaults = new Set(defaults.filter((d) => d.entity_type === entity.entity_type).map((d) => d.capability));
  const rows = Constants.public.Enums.entity_capability.map((c) => ({
    capability: c,
    enabled: (capabilities as string[]).includes(c),
    isDefault: typeDefaults.has(c),
    overridden: overrides.some((o) => o.capability === c),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow={ENTITY_TYPE_LABEL[entity.entity_type]}
        title={entity.name}
        description={`${SECTOR_LABEL[entity.sector]} · ${entity.communities?.name}, ${entity.communities?.districts?.name} · verified ${formatDate(entity.verified_at)}`}
        actions={<StatusBadge status={entity.status} />}
      />
      <div className="flex flex-wrap gap-2">
        {entity.status === "active" ? <Button asChild variant="outline"><Link href={`/directory/${entity.slug}`}><ExternalLink aria-hidden /> Public listing</Link></Button> : null}
        {canManage && entity.status === "active" ? (
          <ReasonDialog
            trigger={<Button variant="destructive">Suspend</Button>}
            title={`Suspend ${entity.name}?`}
            description="The listing and all its products, jobs and events disappear from public view. Members are notified."
            confirmLabel="Suspend"
            destructive
            onConfirm={async (reason) => { "use server"; return setEntityStatusAction({ entityId, status: "suspended", reason }); }}
          />
        ) : null}
        {canManage && entity.status !== "active" ? (
          <ReasonDialog
            trigger={<Button variant="green">Reinstate</Button>}
            title={`Reinstate ${entity.name}?`}
            confirmLabel="Reinstate"
            onConfirm={async (reason) => { "use server"; return setEntityStatusAction({ entityId, status: "active", reason }); }}
          />
        ) : null}
      </div>
      {entity.status_reason ? <Card><CardContent className="text-sm"><span className="text-muted-foreground">Status reason:</span> {entity.status_reason}</CardContent></Card> : null}
      <Section title="Capabilities">
        <CapabilityToggles entityId={entityId} rows={rows} canManage={canManage} />
      </Section>
      <Section title="Members">
        <ul className="divide-y rounded-xl border bg-card">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between p-3 text-sm">
              <Link href={`/admin/users/${m.profiles?.id}`} className="font-medium text-primary hover:underline">{m.profiles?.display_name}</Link>
              <span>{humanize(m.role)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
