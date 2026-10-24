import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModerationButtons } from "@/features/admin/components/moderation-buttons";
import { listAdminEvents } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export default async function AdminEventsPage({ searchParams }: PageProps<"/admin/events">) {
  await requireAdminPermission("events.manage");
  const page = parsePage((await searchParams).page);
  const { items, total, pageSize } = await listAdminEvents(page);
  return (
    <div className="space-y-5">
      <PageHeader title="Events" description="Listings from verified organisations in your scope." />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Organisation</TableHead><TableHead>Community</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.status === "published" ? <Link className="font-medium text-primary hover:underline" href={`/events/${i.slug}`}>{i.title}</Link> : i.title}</TableCell>
                <TableCell>{i.entities?.name}</TableCell>
                <TableCell>{i.communities?.name}</TableCell>
                <TableCell>{formatDate(i.starts_at)}</TableCell>
                <TableCell><StatusBadge status={i.status} /></TableCell>
                <TableCell><ModerationButtons targetType="event" targetId={i.id} status={i.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/events" />
    </div>
  );
}
