import { parsePage } from "@/components/shared/pagination";
import { EntityListPage } from "@/features/admin/components/entity-list-page";
import { requireAdminPermission } from "@/lib/auth/session";
import { enumParam, stringParam } from "@/lib/search-params";

export default async function Page({ searchParams }: PageProps<"/admin/businesses">) {
  await requireAdminPermission("entities.read_all");
  const sp = await searchParams;
  return (
    <EntityListPage
      basePath="/admin/businesses"
      title="Businesses"
      types={["business"]}
      q={stringParam(sp.q)}
      status={enumParam(sp.status, ["active", "suspended", "archived"] as const)}
      page={parsePage(sp.page)}
    />
  );
}
