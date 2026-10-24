import type { z } from "zod";

/** Uniform result for every Server Action. Never contains raw DB errors. */
export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function success<T = undefined>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function failure(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Convert a Zod error into field errors for forms. */
export function validationFailure(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
}
