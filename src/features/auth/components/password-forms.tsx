"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";

import { requestPasswordResetAction, resetPasswordAction } from "../actions";
import { forgotPasswordSchema, resetPasswordSchema } from "../schemas";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(
    forgotPasswordSchema,
    requestPasswordResetAction,
    { defaultValues: { email: "" }, successToast: false, onSuccess: ({ message }) => setSent(message ?? null) },
  );
  if (sent) {
    return (
      <Alert variant="success" role="status">
        <AlertDescription>{sent}</AlertDescription>
      </Alert>
    );
  }
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="email" label="Email" required error={errorFor("email")}>
        <Input type="email" autoComplete="email" {...controlProps("email", errorFor("email"))} {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(resetPasswordSchema, resetPasswordAction, {
    defaultValues: { password: "", confirmPassword: "" },
    onSuccess: () => router.replace("/"),
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="password" label="New password" required hint="At least 10 characters with upper- and lowercase letters and a number." error={errorFor("password")}>
        <Input type="password" autoComplete="new-password" {...controlProps("password", errorFor("password"), true)} {...form.register("password")} />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" required error={errorFor("confirmPassword")}>
        <Input type="password" autoComplete="new-password" {...controlProps("confirmPassword", errorFor("confirmPassword"))} {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
