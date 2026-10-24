"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useActionForm } from "@/hooks/use-action-form";

import { createCustomRoleAction } from "../actions";
import { customRoleSchema } from "../schemas";

export function CustomRoleForm() {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(customRoleSchema, createCustomRoleAction, {
    defaultValues: { key: "", name: "", description: "", scopeLevel: "district" },
    onSuccess: () => { form.reset(); router.refresh(); },
  });
  const reg = (n: Parameters<typeof form.register>[0]) => ({ ...controlProps(n, errorFor(n)), ...form.register(n) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormError message={formError} /></div>
      <Field id="name" label="Role name" required error={errorFor("name")}><Input {...reg("name")} /></Field>
      <Field id="key" label="Key" required error={errorFor("key")}><Input placeholder="e.g. health_liaison" {...reg("key")} /></Field>
      <Field id="scopeLevel" label="Broadest scope" required error={errorFor("scopeLevel")}>
        <NativeSelect {...reg("scopeLevel")}>{["platform", "region", "district", "community"].map((s) => <option key={s} value={s}>{s}</option>)}</NativeSelect>
      </Field>
      <Field id="description" label="Description" error={errorFor("description")}><Input {...reg("description")} /></Field>
      <Button type="submit" disabled={pending} className="sm:w-fit">Create role</Button>
    </form>
  );
}
