import { BadgeCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listApplications } from "@/features/admin/queries";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatRelative, humanize } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

const STATUSES = ["submitted", "under_review", "info_requested", "approved", "rejected", "withdrawn"] as const;
const KINDS = ["business", "organisation"] as const;

export default async function VerificationQueuePage({ searchParams }: PageProps<"/admin/verification">) {
  await requireAdminPermission("entities.verify");
  const sp = await searchParams;
  const status = enumParam(sp.status, STATUSES);
  const kind = enumParam(sp.kind, KINDS);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listApplications({ status, kind, page });
  const href = (s?: string, k?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (k) p.set("kind", k);
    return `/admin/verification${p.size ? `?${p}` : ""}`;
  };
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-sm font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent");
  return (
    <div className="space-y-5">
      <PageHeader title="Verification queue" description="Business and organisation applications in your area, oldest first." />
      <div className="flex flex-wrap gap-2">
        <Link href={href(undefined, kind)} className={chip(!status)}>Open</Link>
        {STATUSES.map((s) => <Link key={s} href={href(s, kind)} className={chip(status === s)}>{humanize(s)}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={href(status)} className={chip(!kind)}>All types</Link>
        <Link href={href(status, "business")} className={chip(kind === "business")}>Businesses</Link>
        <Link href={href(status, "organisation")} className={chip(kind === "organisation")}>Organisations</Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="Queue is clear" description="No applications match this filter." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Type</TableHead><TableHead>Community</TableHead><TableHead>Docs</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/admin/verification/${a.id}`} className="font-semibold text-primary hover:underline">{a.proposed_name}</Link>
                    <span className="block text-xs text-muted-foreground">{a.profiles?.display_name}</span>
                  </TableCell>
                  <TableCell>{ENTITY_TYPE_LABEL[a.entity_type]}</TableCell>
                  <TableCell>{a.communities?.name}</TableCell>
                  <TableCell>{a.application_documents[0]?.count ?? 0}</TableCell>
                  <TableCell>{formatRelative(a.submitted_at)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/verification" searchParams={{ status, kind }} />
    </div>
  );
}
