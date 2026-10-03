"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { humanize } from "@/lib/format";

import { issueAlertAction } from "../actions";
import { alertSchema } from "../schemas";

export type AlertScopeOption = { scope: "community" | "district" | "region"; id: string; label: string };

/** Used by entity workspaces and the admin console; the RPC decides who may alert where. */
export function AlertForm({ entityId, scopes, redirectTo }: { entityId?: string; scopes: AlertScopeOption[]; redirectTo: string }) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(alertSchema, issueAlertAction, {
    defaultValues: { entityId, title: "", body: "", instructions: "", severity: "advisory", category: "other", scope: scopes[0]?.scope, scopeId: scopes[0]?.id ?? "", expiresAt: "" },
    onSuccess: () => router.push(redirectTo),
  });
  const reg = (name: Parameters<typeof form.register>[0], hint = false) => ({ ...controlProps(name, errorFor(name), hint), ...form.register(name) });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="area" label="Area" required error={errorFor("scopeId")}>
        <NativeSelect
          id="area"
          defaultValue={scopes[0] ? `${scopes[0].scope}:${scopes[0].id}` : ""}
          onChange={(e) => {
            const [scope, id] = e.target.value.split(":") as ["community" | "district" | "region", string];
            form.setValue("scope", scope);
            form.setValue("scopeId", id);
          }}
        >
          {scopes.map((s) => <option key={`${s.scope}:${s.id}`} value={`${s.scope}:${s.id}`}>{s.label} ({s.scope})</option>)}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="severity" label="Severity" required hint="Warning and critical alerts notify every resident in the area." error={errorFor("severity")}>
          <NativeSelect {...reg("severity", true)}>{["info", "advisory", "warning", "critical"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</NativeSelect>
        </Field>
        <Field id="category" label="Category" required error={errorFor("category")}>
          <NativeSelect {...reg("category")}>{["fire", "flood", "health", "security", "weather", "utility", "road", "missing_person", "other"].map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</NativeSelect>
        </Field>
      </div>
      <Field id="title" label="Title" required error={errorFor("title")}><Input maxLength={140} {...reg("title")} /></Field>
      <Field id="body" label="What is happening?" required error={errorFor("body")}><Textarea rows={4} maxLength={3000} {...reg("body")} /></Field>
      <Field id="instructions" label="What should people do?" error={errorFor("instructions")}><Textarea rows={3} maxLength={2000} {...reg("instructions")} /></Field>
      <Field id="expiresAt" label="Expires" error={errorFor("expiresAt")}><Input type="datetime-local" {...reg("expiresAt")} /></Field>
      <Button type="submit" variant="destructive" disabled={pending || scopes.length === 0} className="sm:w-fit">{pending ? "Publishing…" : "Publish alert"}</Button>
    </form>
  );
}
