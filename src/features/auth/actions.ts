"use server";

import { redirect } from "next/navigation";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { env } from "@/lib/env";
import { reportError } from "@/lib/monitoring";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

export async function signInAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.status === 429) return failure("Too many attempts. Please wait a moment and try again.");
    if (error.code === "email_not_confirmed") {
      return failure("Please confirm your email address first. Check your inbox for the link.");
    }
    // Same message for unknown email and wrong password (no account enumeration).
    return failure("The email or password is incorrect.");
  }
  return success(undefined, { redirectTo: safeRedirectPath(parsed.data.next, "/") });
}

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/`,
      // user_metadata is client-controlled: only non-privileged preferences.
      data: {
        display_name: parsed.data.displayName,
        home_community_id: parsed.data.homeCommunityId || null,
      },
    },
  });
  if (error) {
    if (error.status === 429) return failure("Too many sign-up attempts. Please try again later.");
    if (error.code === "weak_password") {
      return failure("Choose a stronger password.", { password: [error.message] });
    }
    if (error.code !== "user_already_exists") {
      reportError(error, { context: "auth.signUp" });
      return failure("We couldn't create your account. Please try again.");
    }
  }
  // When confirmation is enabled, Supabase returns no session (and does not
  // reveal whether the email already exists).
  return success("Welcome to BridgeConnect!", { needsConfirmation: !data?.session });
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error && error.status === 429) {
    return failure("Too many requests. Please wait a few minutes and try again.");
  }
  // Always the same response, whether or not the account exists.
  return success("If an account exists for that email, we've sent a reset link.");
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return failure("Your reset link has expired. Please request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return failure("Choose a password you haven't used before.");
    return failure("We couldn't update your password. Please request a new link.");
  }
  return success("Your password has been updated.");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
