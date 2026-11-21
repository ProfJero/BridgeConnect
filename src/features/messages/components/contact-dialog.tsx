"use client";

import { MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { startConversationAction } from "../actions";
import { startConversationSchema } from "../schemas";

/** "Message" button on public listings. Opens (or continues) the viewer's thread with the entity. */
export function ContactDialog({
  entityId,
  entityName,
  signedIn,
  defaultSubject,
  variant = "outline",
  label = "Message",
}: {
  entityId: string;
  entityName: string;
  signedIn: boolean;
  defaultSubject?: string;
  variant?: "outline" | "default" | "soft";
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(startConversationSchema, startConversationAction, {
    defaultValues: { entityId, subject: defaultSubject ?? "", body: "" },
    onSuccess: ({ data }) => {
      setOpen(false);
      router.push(data ? `/messages/${data.id}` : "/messages");
    },
  });

  if (!signedIn) {
    return (
      <Button variant={variant} onClick={() => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)}>
        <MessageSquareText aria-hidden /> {label}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <MessageSquareText aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Message {entityName}</DialogTitle>
          <DialogDescription>
            Your message goes to the verified team at {entityName}. Never share PINs, passwords or mobile-money codes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <Field id="contact-subject" label="Subject" error={errorFor("subject")}>
            <Input maxLength={140} {...controlProps("contact-subject", errorFor("subject"))} {...form.register("subject")} />
          </Field>
          <Field id="contact-body" label="Message" required error={errorFor("body")}>
            <Textarea rows={5} maxLength={2000} {...controlProps("contact-body", errorFor("body"))} {...form.register("body")} />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send message"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
