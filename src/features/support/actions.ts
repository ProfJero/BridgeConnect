"use server";

import { revalidatePath } from "next/cache";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { getViewer } from "@/lib/auth/session";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { ticketReplySchema, ticketSchema, ticketUpdateSchema } from "./schemas";

// Suspended users may still contact support (e.g. to appeal), so these actions
// only require a signed-in viewer; the database decides the rest.
async function requireSignedIn() {
  const viewer = await getViewer();
  return viewer;
}

export async function createTicketAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const viewer = await requireSignedIn();
  if (!viewer) return failure("Please sign in to continue.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_support_ticket", {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
    p_entity: parsed.data.entityId || undefined,
  });
  if (error) return dbFailure(error, "support.create");
  revalidatePath("/support");
  return success("Ticket created. We'll reply here.", { id: data });
}

export async function replyTicketAction(input: unknown): Promise<ActionResult> {
  const parsed = ticketReplySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const viewer = await requireSignedIn();
  if (!viewer) return failure("Please sign in to continue.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_support_ticket", { p_ticket: parsed.data.ticketId, p_body: parsed.data.body });
  if (error) return dbFailure(error, "support.reply");
  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  return success("Reply sent.");
}

export async function updateTicketAction(input: unknown): Promise<ActionResult> {
  const parsed = ticketUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const viewer = await requireSignedIn();
  if (!viewer) return failure("Please sign in to continue.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_support_ticket", {
    p_ticket: parsed.data.ticketId,
    p_status: parsed.data.status,
    p_priority: parsed.data.priority,
    p_assignee: parsed.data.assignToMe ? viewer.id : undefined,
    p_unassign: parsed.data.unassign ?? false,
  });
  if (error) return dbFailure(error, "support.update");
  revalidatePath(`/support/${parsed.data.ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  return success("Ticket updated.");
}
