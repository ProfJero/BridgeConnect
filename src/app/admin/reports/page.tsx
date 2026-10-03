import { Flag } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { ModerationButtons, ReportResolutionButtons } from "@/features/admin/components/moderation-buttons";
import { listReports } from "@/features/admin/queries";
import { REPORT_REASON_LABEL } from "@/features/reports/schemas";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatRelative, humanize } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;

function target(r: Awaited<ReturnType<typeof listReports>>["items"][number]) {
  if (r.post_id) return { type: "post" as const, id: r.post_id, href: `/community/posts/${r.post_id}` };
  if (r.comment_id) return { type: "comment" as const, id: r.comment_id, href: null };
  if (r.product_id) return { type: "product" as const, id: r.product_id, href: null };
  if (r.service_id) return { type: "service" as const, id: r.service_id, href: null };
  if (r.job_id) return { type: "job" as const, id: r.job_id, href: null };
  if (r.event_id) return { type: "event" as const, id: r.event_id, href: null };
  if (r.entity_id) return { type: "entity" as const, id: r.entity_id, href: `/admin/entities/${r.entity_id}` };
  return { type: "profile" as const, id: r.profile_id!, href: `/admin/users/${r.profile_id}` };
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdminPermission("reports.read");
  const sp = await searchParams;
  const status = enumParam(sp.status, STATUSES);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listReports({ status, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Content and accounts flagged by residents in your area." />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/reports" className={cn("rounded-full border px-3 py-1 text-sm font-medium", !status ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>Needs action</Link>
        {STATUSES.map((s) => <Link key={s} href={`/admin/reports?status=${s}`} className={cn("rounded-full border px-3 py-1 text-sm font-medium", status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{humanize(s)}</Link>)}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="Nothing needs your attention right now." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => {
            const t = target(r);
            const actionable = ["open", "reviewing"].includes(r.status);
            return (
              <li key={r.id} className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">{REPORT_REASON_LABEL[r.reason]}</Badge>
                  <Badge variant="secondary">{humanize(t.type)}</Badge>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted-foreground">{formatRelative(r.created_at)} · {r.communities?.name ?? "No community"} · by {r.reporter?.display_name}</span>
                </div>
                {r.details ? <p className="text-sm">{r.details}</p> : null}
                {r.resolution_note ? <p className="text-sm text-muted-foreground">Resolution: {r.resolution_note}</p> : null}
                <div className="flex flex-wrap items-center gap-3">
                  {t.href ? <Link href={t.href} className="text-sm font-medium text-primary hover:underline">View reported {t.type}</Link> : null}
                  {actionable && t.type !== "entity" && t.type !== "profile" ? <ModerationButtons targetType={t.type} targetId={t.id} reportId={r.id} /> : null}
                  {actionable && (t.type === "entity" || t.type === "profile") ? <ReportResolutionButtons reportId={r.id} /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/reports" searchParams={{ status }} />
    </div>
  );
}

