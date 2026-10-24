import { notFound } from "next/navigation";

import { UserAvatar } from "@/components/shared/avatars";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revokeRoleAction, setAccountStatusAction } from "@/features/admin/actions";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { RoleAssignmentForm } from "@/features/admin/components/role-assignment-form";
import { getLocationTree, getRolesWithPermissions, getUserDetail } from "@/features/admin/queries";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { canAnywhere } from "@/lib/auth/permissions";
import { isUuid, requireAdminPermission } from "@/lib/auth/session";
import { formatDate, formatDateTime, humanize } from "@/lib/format";

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[userId]">) {
  const { userId } = await params;
  if (!isUuid(userId)) notFound();
  const viewer = await requireAdminPermission("users.read");
  const detail = await getUserDetail(userId);
  if (!detail.profile) notFound();
  const p = detail.profile;
  const canAssign = canAnywhere(viewer.grants, "roles.assign") && userId !== viewer.id;
  const canManage = canAnywhere(viewer.grants, "users.manage") && userId !== viewer.id;
  const [{ roles }, locations] = canAssign ? await Promise.all([getRolesWithPermissions(), getLocationTree()]) : [{ roles: [] }, null];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={p.display_name}
        eyebrow="User"
        description={p.username ? `@${p.username}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={p.account_status} />
            {p.is_demo ? <Badge variant="warning">Demo account</Badge> : null}
          </div>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <UserAvatar name={p.display_name} path={p.avatar_path} className="size-14" />
          <div className="grid flex-1 gap-1 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Home community:</span> {p.communities?.name ?? "Not set"}</p>
            <p><span className="text-muted-foreground">Joined:</span> {formatDate(p.created_at)}</p>
          </div>
          {canManage ? (
            p.account_status === "active" ? (
              <ReasonDialog
                trigger={<Button variant="destructive">Suspend account</Button>}
                title="Suspend this account?"
                description="The user can still sign in and browse, but cannot post, order, apply or manage workspaces."
                confirmLabel="Suspend"
                destructive
                onConfirm={async (reason) => {
                  "use server";
                  return setAccountStatusAction({ userId, status: "suspended", reason });
                }}
              />
            ) : (
              <ReasonDialog
                trigger={<Button variant="green">Reinstate account</Button>}
                title="Reinstate this account?"
                confirmLabel="Reinstate"
                onConfirm={async (reason) => {
                  "use server";
                  return setAccountStatusAction({ userId, status: "active", reason });
                }}
              />
            )
          ) : null}
        </CardContent>
      </Card>

      <Section title="Roles">
        {detail.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Resident only — no administrative roles.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {detail.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-semibold">{a.roles?.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {a.regions?.name ?? a.districts?.name ?? a.communities?.name ?? "Whole platform"}
                    {a.expires_at ? ` · expires ${formatDate(a.expires_at)}` : ""}
                  </span>
                </span>
                {canAssign ? (
                  <ReasonDialog
                    trigger={<Button variant="outline" size="sm">Revoke</Button>}
                    title={`Revoke ${a.roles?.name}?`}
                    confirmLabel="Revoke role"
                    destructive
                    optional
                    onConfirm={async () => {
                      "use server";
                      return revokeRoleAction(a.id, userId);
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canAssign && locations ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Assign a role</CardTitle></CardHeader>
            <CardContent>
              <RoleAssignmentForm userId={userId} roles={roles.map((r) => ({ key: r.key, name: r.name, scope_level: r.scope_level }))} locations={locations} />
            </CardContent>
          </Card>
        ) : null}
      </Section>

      <Section title="Workspaces">
        {detail.memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not a member of any organisation.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {detail.memberships.map((m) => m.entities ? (
              <li key={m.id} className="flex items-center justify-between gap-3 p-4">
                <span>
                  <a href={`/admin/entities/${m.entities.id}`} className="font-semibold text-primary hover:underline">{m.entities.name}</a>
                  <span className="block text-sm text-muted-foreground">{ENTITY_TYPE_LABEL[m.entities.entity_type]} · {humanize(m.role)}</span>
                </span>
                <StatusBadge status={m.entities.status} />
              </li>
            ) : null)}
          </ul>
        )}
      </Section>

      <Section title="Recent activity">
        {detail.audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audited activity.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card text-sm">
            {detail.audit.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 p-3"><code className="text-xs">{e.action}</code><time className="text-muted-foreground">{formatDateTime(e.created_at)}</time></li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
