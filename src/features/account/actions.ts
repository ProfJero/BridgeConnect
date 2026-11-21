"use server";

import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { getViewer } from "@/lib/auth/session";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** Permanently delete (or, when orders must be kept, anonymise) the caller's account. */
export async function deleteAccountAction(confirm: string): Promise<ActionResult> {
  if (!z.literal("DELETE").safeParse(confirm).success) return failure("Type DELETE to confirm.");
  const viewer = await getViewer();
  if (!viewer) return failure("Please sign in to continue.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account", { p_confirm: confirm });
  if (error) {
    if (error.code === "23514") {
      return failure(
        error.message.includes("platform owner")
          ? "The last platform owner cannot delete their account. Appoint another owner first."
          : "Transfer ownership of your organisations (Workspace → Members) before deleting your account.",
      );
    }
    return dbFailure(error, "account.delete");
  }
  await supabase.auth.signOut();
  return success("Your account has been deleted.");
}
