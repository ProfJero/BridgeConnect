"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionForm } from "@/hooks/use-action-form";

import { signInAction } from "../actions";
import { signInSchema } from "../schemas";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(signInSchema, signInAction, {
    defaultValues: { email: "", password: "", next },
    successToast: false,
    onSuccess: ({ data }) => {
      router.replace(data?.redirectTo ?? "/");
      router.refresh();
    },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="email" label="Email" required error={errorFor("email")}>
        <Input type="email" autoComplete="email" inputMode="email" {...controlProps("email", errorFor("email"))} {...form.register("email")} />
      </Field>
      <Field id="password" label="Password" required error={errorFor("password")}>
        <Input type="password" autoComplete="current-password" {...controlProps("password", errorFor("password"))} {...form.register("password")} />
      </Field>
      <div className="-mt-2 text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
