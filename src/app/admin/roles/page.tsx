import { PageHeader, Section } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CustomRoleForm } from "@/features/admin/components/custom-role-form";
import { RoleMatrix } from "@/features/admin/components/role-matrix";
import { getRolesWithPermissions } from "@/features/admin/queries";
import { can } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/auth/session";

export default async function AdminRolesPage() {
  const viewer = await requireAdminPermission("roles.read");
  const { roles, permissions, rolePermissions } = await getRolesWithPermissions();
  const canManage = can(viewer.grants, "roles.manage");
  return (
    <div className="space-y-6">
      <PageHeader title="Roles & permissions" description="Roles bundle permissions. Assign roles to people from their user page; every assignment is scoped to the platform, a region, a district or a community." />
      <Section title="Permission matrix">
        <RoleMatrix roles={roles} permissions={permissions} granted={rolePermissions.map((rp) => `${rp.role_id}:${rp.permission_key}`)} canManage={canManage} />
        <p className="text-xs text-muted-foreground">System roles are fixed. * marks custom roles, which platform owners can edit. A custom role can never grant a permission its editor lacks.</p>
      </Section>
      {canManage ? (
        <Section title="Create a custom role">
          <Card><CardContent><CustomRoleForm /></CardContent></Card>
        </Section>
      ) : null}
    </div>
  );
}
