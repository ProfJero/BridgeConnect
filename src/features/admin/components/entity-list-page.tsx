import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchForm } from "@/components/widgets/search-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ENTITY_TYPE_LABEL, type EntityType } from "@/features/directory/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { listAdminEntities } from "../queries";

export async function EntityListPage({ basePath, title, types, q, status, page }: { basePath: string; title: string; types: EntityType[]; q?: string; status?: "active" | "suspended" | "archived"; page: number }) {
  const { items, total, pageSize } = await listAdminEntities({ types, q, status, page });
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-sm font-medium", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent");
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={`${total} verified ${title.toLowerCase()} in your scope`} />
      <SearchForm action={basePath} defaultValue={q} placeholder={`Search ${title.toLowerCase()}`} hidden={{ status }} />
      <div className="flex flex-wrap gap-2">
        <Link href={basePath} className={chip(!status)}>All</Link>
        {(["active", "suspended", "archived"] as const).map((s) => <Link key={s} href={`${basePath}?status=${s}`} className={chip(status === s)}>{s}</Link>)}
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Location</TableHead><TableHead>Verified</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nothing found.</TableCell></TableRow>
            ) : items.map((e) => (
              <TableRow key={e.id}>
                <TableCell><Link href={`/admin/entities/${e.id}`} className="font-semibold text-primary hover:underline">{e.name}</Link></TableCell>
                <TableCell>{ENTITY_TYPE_LABEL[e.entity_type]}</TableCell>
                <TableCell>{e.communities?.name}{e.communities?.districts ? `, ${e.communities.districts.name}` : ""}</TableCell>
                <TableCell>{formatDate(e.verified_at)}</TableCell>
                <TableCell><StatusBadge status={e.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={total} basePath={basePath} searchParams={{ q, status }} />
    </div>
  );
}
