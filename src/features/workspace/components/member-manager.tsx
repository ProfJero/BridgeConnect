"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { UserAvatar } from "@/components/shared/avatars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useActionForm } from "@/hooks/use-action-form";
import { useServerAction } from "@/hooks/use-server-action";
import { canManageMember, grantableRoles, type MembershipRole } from "@/lib/auth/permissions";
import { humanize } from "@/lib/format";

import { addMemberAction, removeMemberAction, updateMemberRoleAction } from "../actions";
import { addMemberSchema } from "../schemas";

type Member = { id: string; role: MembershipRole; user_id: string; profiles: { display_name: string; avatar_path: string | null } | null };

export function MemberManager({ entityId, members, myRole, myUserId }: { entityId: string; members: Member[]; myRole: MembershipRole; myUserId: string }) {
  const router = useRouter();
  const { pending, run } = useServerAction();
  const roles = grantableRoles(myRole);
  const { form, onSubmit, pending: adding, formError, errorFor } = useActionForm(addMemberSchema, addMemberAction, {
    defaultValues: { entityId, email: "", role: roles.includes("editor") ? "editor" : roles[roles.length - 1] },
    onSuccess: () => {
      form.reset({ entityId, email: "", role: "editor" });
      router.refresh();
    },
  });
  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-xl border bg-card">
        {members.map((m) => {
          const self = m.user_id === myUserId;
          const manageable = !self && canManageMember(myRole, m.role);
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-3">
                <UserAvatar name={m.profiles?.display_name ?? "Member"} path={m.profiles?.avatar_path} />
                <span>
                  <span className="block font-medium">{m.profiles?.display_name}{self ? " (you)" : ""}</span>
                  <Badge variant="soft">{humanize(m.role)}</Badge>
                </span>
              </span>
              <span className="flex items-center gap-2">
                {manageable ? (
                  <NativeSelect
                    aria-label={`Role for ${m.profiles?.display_name}`}
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => run(() => updateMemberRoleAction({ entityId, membershipId: m.id, role: e.target.value }))}
                  >
                    {[...new Set([m.role, ...roles])].map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
                  </NativeSelect>
                ) : null}
                {manageable || (self && m.role !== "owner") ? (
                  <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => removeMemberAction(entityId, m.id), self ? { onSuccess: () => router.push("/") } : {})}>
                    {self ? "Leave" : "Remove"}
                  </Button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {roles.length > 0 ? (
        <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div className="sm:col-span-3"><FormError message={formError} /></div>
          <Field id="email" label="Add a member by email" required hint="They must already have a BridgeConnect account." error={errorFor("email")}>
            <Input type="email" {...controlProps("email", errorFor("email"), true)} {...form.register("email")} />
          </Field>
          <Field id="role" label="Role" required error={errorFor("role")}>
            <NativeSelect {...controlProps("role", errorFor("role"))} {...form.register("role")}>
              {roles.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
            </NativeSelect>
          </Field>
          <Button type="submit" disabled={adding}><UserPlus aria-hidden /> Add</Button>
        </form>
      ) : null}
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <p><strong className="text-foreground">Owner</strong> — full control, including members and settings.</p>
        <p><strong className="text-foreground">Manager</strong> — edits the profile, ads and analytics; adds editors and members.</p>
        <p><strong className="text-foreground">Editor</strong> — manages listings, posts, orders and applicants.</p>
        <p><strong className="text-foreground">Member</strong> — can view the workspace.</p>
      </div>
    </div>
  );
}
