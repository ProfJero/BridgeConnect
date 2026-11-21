"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { createTicketAction } from "../actions";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABEL, ticketSchema } from "../schemas";

export function TicketForm({
  workspaces,
  defaultCategory,
  defaultEntityId,
}: {
  workspaces: { entityId: string; name: string }[];
  defaultCategory?: (typeof TICKET_CATEGORIES)[number];
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(ticketSchema, createTicketAction, {
    defaultValues: { category: defaultCategory, subject: "", body: "", entityId: defaultEntityId ?? "" },
    onSuccess: ({ data }) => router.push(data ? `/support/${data.id}` : "/support"),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ticket-category" label="Topic" required error={errorFor("category")}>
          <NativeSelect {...controlProps("ticket-category", errorFor("category"))} {...form.register("category")}>
            <option value="">Choose…</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>
            ))}
          </NativeSelect>
        </Field>
        {workspaces.length ? (
          <Field id="ticket-entity" label="About one of your workspaces?" error={errorFor("entityId")}>
            <NativeSelect {...controlProps("ticket-entity", errorFor("entityId"))} {...form.register("entityId")}>
              <option value="">No — about me</option>
              {workspaces.map((w) => (
                <option key={w.entityId} value={w.entityId}>{w.name}</option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
      </div>
      <Field id="ticket-subject" label="Subject" required error={errorFor("subject")}>
        <Input maxLength={140} {...controlProps("ticket-subject", errorFor("subject"))} {...form.register("subject")} />
      </Field>
      <Field id="ticket-body" label="How can we help?" required error={errorFor("body")} hint="Include what you tried and any order or booking numbers. Never share your password.">
        <Textarea rows={7} maxLength={4000} {...controlProps("ticket-body", errorFor("body"), true)} {...form.register("body")} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Sending…" : "Send to DBI support"}</Button>
    </form>
  );
}
