"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useActionForm } from "@/hooks/use-action-form";

import { assignRoleAction } from "../actions";
import { assignRoleSchema } from "../schemas";
import { ScopeSelect, type LocationOptions } from "./scope-picker";

const RANK = { platform: 0, region: 1, district: 2, community: 3 } as const;

export function RoleAssignmentForm({
  userId,
  roles,
  locations,
}: {
  userId: string;
  roles: { key: string; name: string; scope_level: keyof typeof RANK }[];
  locations: LocationOptions;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(assignRoleSchema, assignRoleAction, {
    defaultValues: { userId, roleKey: roles[0]?.key ?? "", scope: roles[0]?.scope_level ?? "district", scopeId: "", expiresAt: "" },
    onSuccess: () => router.refresh(),
  });
  const roleKey = form.watch("roleKey");
  const scope = form.watch("scope");
  const role = roles.find((r) => r.key === roleKey);
  const allowedScopes = (Object.keys(RANK) as (keyof typeof RANK)[]).filter((s) => role && RANK[s] >= RANK[role.scope_level]);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormError message={formError} /></div>
      <Field id="roleKey" label="Role" required error={errorFor("roleKey")}>
        <NativeSelect {...controlProps("roleKey", errorFor("roleKey"))} {...form.register("roleKey", { onChange: (e) => { const r = roles.find((x) => x.key === e.target.value); if (r) form.setValue("scope", r.scope_level); form.setValue("scopeId", ""); } })}>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </NativeSelect>
      </Field>
      <Field id="scope" label="Applies to" required error={errorFor("scope")}>
        <NativeSelect {...controlProps("scope", errorFor("scope"))} {...form.register("scope", { onChange: () => form.setValue("scopeId", "") })}>
          {allowedScopes.map((s) => <option key={s} value={s}>{s === "platform" ? "Whole platform" : `One ${s}`}</option>)}
        </NativeSelect>
      </Field>
      {scope !== "platform" ? (
        <Field id="scopeId" label={`Which ${scope}?`} required error={errorFor("scopeId")}>
          <ScopeSelect scope={scope} locations={locations} {...controlProps("scopeId", errorFor("scopeId"))} {...form.register("scopeId")} />
        </Field>
      ) : null}
      <Field id="expiresAt" label="Expires on" error={errorFor("expiresAt")}>
        <Input type="date" {...controlProps("expiresAt", errorFor("expiresAt"))} {...form.register("expiresAt")} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-xs text-muted-foreground">You can only grant roles whose permissions you already hold in that area.</p>
        <Button type="submit" disabled={pending}>{pending ? "Assigning…" : "Assign role"}</Button>
      </div>
    </form>
  );
}
