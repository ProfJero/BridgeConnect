"use client";

import { Star } from "lucide-react";
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

import { saveReviewAction } from "../actions";
import { reviewSchema } from "../schemas";
import { StarInput } from "./star-input";

export function ReviewDialog({
  entityId,
  entityName,
  signedIn,
  existing,
}: {
  entityId: string;
  entityName: string;
  signedIn: boolean;
  existing?: { rating: number; title: string | null; body: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(reviewSchema, saveReviewAction, {
    defaultValues: {
      entityId,
      rating: existing?.rating ?? 0,
      title: existing?.title ?? "",
      body: existing?.body ?? "",
    },
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  const rating = Number(form.watch("rating") ?? 0);

  if (!signedIn) {
    return (
      <Button variant="outline" onClick={() => router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`)}>
        <Star aria-hidden /> Write a review
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={existing ? "outline" : "default"}>
          <Star aria-hidden /> {existing ? "Edit your review" : "Write a review"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : `Review ${entityName}`}</DialogTitle>
          <DialogDescription>Share an honest experience to help your neighbours. Reviews are public.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <FormError message={formError} />
          <Field id="rating" label="Your rating" required error={errorFor("rating")}>
            <StarInput id="rating" value={rating} invalid={Boolean(errorFor("rating"))} onChange={(v) => form.setValue("rating", v, { shouldValidate: true })} />
          </Field>
          <Field id="review-title" label="Headline" error={errorFor("title")}>
            <Input maxLength={120} {...controlProps("review-title", errorFor("title"))} {...form.register("title")} />
          </Field>
          <Field id="review-body" label="Your experience" required error={errorFor("body")}>
            <Textarea rows={5} maxLength={2000} {...controlProps("review-body", errorFor("body"))} {...form.register("body")} />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : existing ? "Update review" : "Publish review"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
