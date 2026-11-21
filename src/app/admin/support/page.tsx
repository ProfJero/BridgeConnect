import { LifeBuoy } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { adminListTickets } from "@/features/support/queries";
import { TICKET_CATEGORY_LABEL } from "@/features/support/schemas";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "active", label: "Needs attention" },
  { key: "mine", label: "Assigned to me" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
] as const;

export default async function AdminSupportPage({ searchParams }: PageProps<"/admin/support">) {
  const viewer = await requireAdminPermission("support.manage");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "active";
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await adminListTickets({
    status: filter === "mine" ? "active" : filter,
    mine: filter === "mine" ? viewer.id : undefined,
    page,
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Support desk" description="Tickets from residents and workspaces. Replies are sent as DBI Support." />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/support?filter=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm font-medium", filter === f.key ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Inbox zero" description="No tickets match this view." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/support/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">#{t.ticket_number} · {t.subject}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.requester?.display_name ?? "User"}{t.entities?.name ? ` for ${t.entities.name}` : ""} · {TICKET_CATEGORY_LABEL[t.category]} · {formatRelative(t.last_activity_at)}
                    {t.assignee?.display_name ? ` · assigned to ${t.assignee.display_name}` : " · unassigned"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {t.priority === "high" || t.priority === "urgent" ? <Badge variant="destructive">{t.priority}</Badge> : null}
                  <StatusBadge status={t.status} label={t.status === "pending" ? "Awaiting requester" : undefined} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/support" searchParams={{ filter }} />
    </div>
  );
}
