"use client";

import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";

import { respondToReviewAction } from "../actions";
import { reviewResponseSchema } from "../schemas";

export function ReviewReplyForm({ reviewId, entityId, initial }: { reviewId: string; entityId: string; initial: string | null }) {
  const router = useRouter();
  const id = `reply-${reviewId}`;
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(reviewResponseSchema, respondToReviewAction, {
    defaultValues: { reviewId, entityId, response: initial ?? "" },
    onSuccess: () => router.refresh(),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <FormError message={formError} />
      <Field id={id} label="Public reply" error={errorFor("response")} hint="Shown under the review on your public page. Leave empty to remove.">
        <Textarea rows={3} maxLength={2000} {...controlProps(id, errorFor("response"), true)} {...form.register("response")} />
      </Field>
      <Button type="submit" size="sm" className="justify-self-start" disabled={pending}>
        {pending ? "Saving…" : initial ? "Update reply" : "Publish reply"}
      </Button>
    </form>
  );
}
