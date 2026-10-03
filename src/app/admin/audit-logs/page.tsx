import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchForm } from "@/components/widgets/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAuditLogs } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { stringParam } from "@/lib/search-params";

export default async function AuditLogsPage({ searchParams }: PageProps<"/admin/audit-logs">) {
  await requireAdminPermission("audit.read");
  const sp = await searchParams;
  const action = stringParam(sp.q, 60);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listAuditLogs({ action, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Audit logs" description="Append-only record of sensitive actions. Entries cannot be edited or deleted." />
      <SearchForm action="/admin/audit-logs" defaultValue={action} placeholder="Filter by action prefix, e.g. verification." />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(e.created_at)}</TableCell>
                <TableCell>{e.profiles?.display_name ?? "System"}</TableCell>
                <TableCell><code className="text-xs">{e.action}</code></TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.target_table}{e.target_id ? ` · ${e.target_id.slice(0, 8)}` : ""}</TableCell>
                <TableCell><pre className="max-w-md overflow-x-auto text-xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify(e.metadata).slice(0, 300)}</pre></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/audit-logs" searchParams={{ q: action }} />
    </div>
  );
}
