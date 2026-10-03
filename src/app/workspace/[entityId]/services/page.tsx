import { PlusCircle, Wrench } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listEntityServices } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";

export default async function WorkspaceServicesPage({ params }: PageProps<"/workspace/[entityId]/services">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "services");
  const services = await listEntityServices(entityId);
  const base = `/workspace/${entityId}/services`;
  return (
    <div className="space-y-5">
      <PageHeader title="Services" actions={<Button asChild><Link href={`${base}/new`}><PlusCircle aria-hidden /> Add service</Link></Button>} />
      {services.length === 0 ? (
        <EmptyState icon={Wrench} title="No services yet" description="Describe the services you offer so residents can find you." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-4">
              <span>
                {s.status === "removed" ? <span className="font-semibold">{s.name}</span> : <Link href={`${base}/${s.id}`} className="font-semibold text-primary hover:underline">{s.name}</Link>}
                <span className="block text-sm text-muted-foreground">{s.price_from != null ? `From ${formatMoney(s.price_from, s.currency)}` : s.price_note ?? "No price set"}</span>
                {s.moderation_reason ? <span className="block text-xs text-destructive">Removed: {s.moderation_reason}</span> : null}
              </span>
              <StatusBadge status={s.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
