"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { UserAvatar } from "@/components/shared/avatars";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { replyTicketAction } from "../actions";
import { ticketReplySchema } from "../schemas";

type TicketMessage = {
  id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
  profiles: { display_name: string; avatar_path: string | null } | null;
};

export function TicketThread({
  ticketId,
  messages,
  canReply,
  closedReason,
}: {
  ticketId: string;
  messages: TicketMessage[];
  canReply: boolean;
  closedReason?: string;
}) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(ticketReplySchema, replyTicketAction, {
    defaultValues: { ticketId, body: "" },
    onSuccess: () => {
      form.reset({ ticketId, body: "" });
      router.refresh();
    },
  });
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={cn("rounded-xl border p-4", m.is_staff ? "border-primary/30 bg-primary-soft/40" : "bg-card")}>
            <div className="mb-2 flex items-center gap-2">
              <UserAvatar name={m.profiles?.display_name ?? "User"} path={m.profiles?.avatar_path} className="size-7" />
              <span className="text-sm font-semibold">{m.is_staff ? "DBI Support" : m.profiles?.display_name ?? "User"}</span>
              {m.is_staff ? <ShieldCheck aria-label="Staff" className="size-4 text-link" /> : null}
              <time dateTime={m.created_at} className="ml-auto text-xs text-muted-foreground">{formatDateTime(m.created_at)}</time>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line">{m.body}</p>
          </li>
        ))}
      </ol>
      {canReply ? (
        <form onSubmit={onSubmit} noValidate className="grid gap-3 rounded-xl border bg-card p-4">
          <FormError message={formError} />
          <Field id="ticket-reply" label="Reply" required error={errorFor("body")}>
            <Textarea rows={4} maxLength={4000} {...controlProps("ticket-reply", errorFor("body"))} {...form.register("body")} />
          </Field>
          <Button type="submit" className="justify-self-start" disabled={pending}>{pending ? "Sending…" : "Send reply"}</Button>
        </form>
      ) : (
        <p className="rounded-xl border bg-muted p-4 text-center text-sm text-muted-foreground">{closedReason}</p>
      )}
    </div>
  );
}
