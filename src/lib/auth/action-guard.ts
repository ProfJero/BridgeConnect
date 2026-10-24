import "server-only";

import { failure, type ActionResult } from "@/lib/action-result";
import { getViewer, type Viewer } from "@/lib/auth/session";

export type GuardResult = { ok: true; viewer: Viewer } | { ok: false; result: ActionResult<never> };

/**
 * First line of every mutating Server Action: a signed-in, non-suspended user.
 * Fine-grained authorization is enforced again by RLS / SECURITY DEFINER RPCs.
 */
export async function guardActiveViewer(): Promise<GuardResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, result: failure("Please sign in to continue.") };
  if (!viewer.isActive) return { ok: false, result: failure("Your account is suspended.") };
  return { ok: true, viewer };
}
