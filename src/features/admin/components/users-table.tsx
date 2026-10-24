"use client";

import Link from "next/link";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/format";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string;
  account_status: string;
  is_demo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  role_keys: string[];
};

const columns: DataTableColumn<AdminUserRow>[] = [
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <Link href={`/admin/users/${row.original.id}`} className="font-semibold text-primary hover:underline">{row.original.display_name}</Link>
        <span className="block text-xs text-muted-foreground">{row.original.email}</span>
      </div>
    ),
  },
  {
    accessorKey: "role_keys",
    header: "Roles",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.role_keys.length ? row.original.role_keys.map((r) => <Badge key={r} variant="soft">{humanize(r)}</Badge>) : <span className="text-xs text-muted-foreground">Resident</span>}
        {row.original.is_demo ? <Badge variant="warning">Demo</Badge> : null}
      </div>
    ),
  },
  { accessorKey: "account_status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.account_status} /> },
  { accessorKey: "created_at", header: "Joined", sortFn: "datetime", cell: ({ row }) => formatDate(row.original.created_at) },
  { accessorKey: "last_sign_in_at", header: "Last sign-in", cell: ({ row }) => (row.original.last_sign_in_at ? formatDate(row.original.last_sign_in_at) : "Never") },
];

export function UsersTable({ data }: { data: AdminUserRow[] }) {
  return <DataTable columns={columns} data={data} caption="Users" empty="No users match your filters." />;
}
