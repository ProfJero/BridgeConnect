import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { SearchForm } from "@/components/widgets/search-form";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { UsersTable } from "@/features/admin/components/users-table";
import { listUsers } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { enumParam, stringParam } from "@/lib/search-params";

const STATUSES = ["active", "suspended", "deactivated"] as const;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdminPermission("users.read");
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const status = enumParam(sp.status, STATUSES);
  const page = parsePage(sp.page);
  const { items, total, pageSize } = await listUsers({ q, status, page });
  return (
    <div className="space-y-5">
      <PageHeader title="Users" description={`${total} accounts in your scope`} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchForm action="/admin/users" defaultValue={q} placeholder="Search name, email or username" hidden={{ status }} />
        <form action="/admin/users" className="flex gap-2">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          <label htmlFor="status" className="sr-only">Status</label>
          <NativeSelect id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
          <Button type="submit" variant="outline">Filter</Button>
        </form>
      </div>
      <UsersTable data={items} />
      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/users" searchParams={{ q, status }} />
    </div>
  );
}
