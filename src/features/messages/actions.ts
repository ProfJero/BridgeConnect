"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { CONVERSATION_STATUSES, sendMessageSchema, startConversationSchema } from "./schemas";

export async function startConversationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = startConversationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_entity: parsed.data.entityId,
    p_subject: parsed.data.subject ?? "",
    p_body: parsed.data.body,
  });
  if (error) {
    if (error.code === "42501") return failure("This organisation isn't accepting messages right now.");
    return dbFailure(error, "messages.start");
  }
  revalidatePath("/messages");
  return success("Message sent.", { id: data });
}

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_message", {
    p_conversation: parsed.data.conversationId,
    p_body: parsed.data.body,
  });
  if (error) {
    if (error.code === "42501") return failure("You can't send messages in this conversation.");
    return dbFailure(error, "messages.send");
  }
  return success();
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(conversationId).success) return failure("Invalid conversation.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
  if (error) return dbFailure(error, "messages.read");
  return success();
}

export async function setConversationStatusAction(
  conversationId: string,
  status: (typeof CONVERSATION_STATUSES)[number],
): Promise<ActionResult> {
  if (!z.uuid().safeParse(conversationId).success || !z.enum(CONVERSATION_STATUSES).safeParse(status).success) {
    return failure("Invalid request.");
  }
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_conversation_status", { p_conversation: conversationId, p_status: status });
  if (error) return dbFailure(error, "messages.status");
  return success(status === "blocked" ? "Contact blocked." : status === "closed" ? "Conversation closed." : "Conversation reopened.");
}
