"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useServerAction } from "@/hooks/use-server-action";

import { toggleRolePermissionAction } from "../actions";

/** Permission matrix. System roles are read-only (enforced by RLS). */
export function RoleMatrix({
  roles,
  permissions,
  granted,
  canManage,
}: {
  roles: { id: string; name: string; is_system: boolean }[];
  permissions: { key: string; category: string; description: string }[];
  granted: string[];
  canManage: boolean;
}) {
  const { pending, run } = useServerAction();
  const set = new Set(granted);
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Permissions granted to each role</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="sticky left-0 bg-card p-3 text-left text-xs font-semibold text-muted-foreground uppercase">Permission</th>
            {roles.map((r) => <th key={r.id} scope="col" className="p-3 text-center text-xs font-semibold whitespace-nowrap">{r.name}{r.is_system ? "" : " *"}</th>)}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.key} className="border-b last:border-0">
              <th scope="row" className="sticky left-0 bg-card p-3 text-left font-normal">
                <span className="block font-medium">{p.description}</span>
                <code className="text-xs text-muted-foreground">{p.key}</code>
              </th>
              {roles.map((r) => {
                const on = set.has(`${r.id}:${p.key}`);
                return (
                  <td key={r.id} className="p-3 text-center">
                    <Checkbox
                      checked={on}
                      disabled={!canManage || r.is_system || pending}
                      aria-label={`${p.key} for ${r.name}`}
                      onCheckedChange={(v) => run(() => toggleRolePermissionAction(r.id, p.key, v === true))}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
