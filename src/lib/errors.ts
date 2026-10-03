import type { PostgrestError } from "@supabase/supabase-js";

import { failure, type ActionResult } from "@/lib/action-result";
import { reportError } from "@/lib/monitoring";

/**
 * SQLSTATE codes BridgeConnect raises deliberately with user-safe messages
 * (see migrations). Anything else is replaced with a generic message so that
 * internal details never reach the browser.
 */
const SAFE_MESSAGE_CODES = new Set(["22023", "54000", "P0002"]);

export function toUserMessage(error: Pick<PostgrestError, "code" | "message"> | null): string {
  if (!error) return "Something went wrong. Please try again.";
  if (SAFE_MESSAGE_CODES.has(error.code)) return error.message;
  switch (error.code) {
    case "42501":
      return "You don't have permission to do that.";
    case "23505":
      return "That already exists.";
    case "23503":
      return "A related record could not be found.";
    case "23514":
    case "22P02":
    case "23502":
      return "Some of the information provided is not valid.";
    case "PGRST116":
      return "Not found.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Map a database error to a failed ActionResult and report unexpected ones. */
export function dbFailure(error: PostgrestError, context: string): ActionResult<never> {
  const expected = SAFE_MESSAGE_CODES.has(error.code) || ["42501", "23505"].includes(error.code);
  if (!expected) reportError(error, { context });
  return failure(toUserMessage(error));
}
