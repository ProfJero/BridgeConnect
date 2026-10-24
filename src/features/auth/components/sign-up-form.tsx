"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CommunitySelect, type CommunityChoice } from "@/components/forms/community-select";
import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionForm } from "@/hooks/use-action-form";

import { signUpAction } from "../actions";
import { signUpSchema } from "../schemas";

export function SignUpForm({ communities }: { communities: CommunityChoice[] }) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState(false);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(signUpSchema, signUpAction, {
    defaultValues: { displayName: "", email: "", password: "", homeCommunityId: "" },
    onSuccess: ({ data }) => {
      if (data?.needsConfirmation) {
        setConfirmEmail(true);
      } else {
        router.replace("/");
        router.refresh();
      }
    },
  });

  if (confirmEmail) {
    return (
      <div role="status" className="space-y-3 text-center">
        <MailCheck aria-hidden className="mx-auto size-10 text-brand-green" />
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{form.getValues("email")}</strong>. Open it to activate your account.
        </p>
        <Button asChild variant="outline">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  const acceptTerms = form.watch("acceptTerms");
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="displayName" label="Full name" required error={errorFor("displayName")}>
        <Input autoComplete="name" {...controlProps("displayName", errorFor("displayName"))} {...form.register("displayName")} />
      </Field>
      <Field id="email" label="Email" required error={errorFor("email")}>
        <Input type="email" autoComplete="email" inputMode="email" {...controlProps("email", errorFor("email"))} {...form.register("email")} />
      </Field>
      <Field
        id="password"
        label="Password"
        required
        hint="At least 10 characters with upper- and lowercase letters and a number."
        error={errorFor("password")}
      >
        <Input type="password" autoComplete="new-password" {...controlProps("password", errorFor("password"), true)} {...form.register("password")} />
      </Field>
      <Field id="homeCommunityId" label="Your community" hint="Personalises your feed and alerts." error={errorFor("homeCommunityId")}>
        <CommunitySelect options={communities} {...controlProps("homeCommunityId", errorFor("homeCommunityId"), true)} {...form.register("homeCommunityId")} />
      </Field>
      <div className="grid gap-1">
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptTerms"
            checked={acceptTerms === true}
            onCheckedChange={(v) => form.setValue("acceptTerms", v === true ? true : (undefined as never), { shouldValidate: true })}
            aria-invalid={errorFor("acceptTerms") ? true : undefined}
            aria-describedby={errorFor("acceptTerms") ? "acceptTerms-error" : undefined}
          />
          <Label htmlFor="acceptTerms" className="leading-snug font-normal">
            I agree to the BridgeConnect community guidelines and will keep my posts respectful and truthful.
          </Label>
        </div>
        {errorFor("acceptTerms") ? (
          <p id="acceptTerms-error" role="alert" className="text-xs font-medium text-destructive">
            {errorFor("acceptTerms")}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
