import "server-only";

import { createClient } from "@/lib/supabase/server";

const CONVERSATION_FIELDS =
  "id, entity_id, user_id, subject, status, last_message_at, last_message_preview, last_sender_side, user_last_read_at, entity_last_read_at, created_at, entities(name, slug, logo_path), profiles!conversations_user_id_fkey(display_name, avatar_path)" as const;

export async function listMyConversations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_FIELDS)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listEntityConversations(entityId: string, status?: "open" | "closed" | "blocked") {
  const supabase = await createClient();
  let query = supabase.from("conversations").select(CONVERSATION_FIELDS).eq("entity_id", entityId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("last_message_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export type ConversationData = Awaited<ReturnType<typeof listMyConversations>>[number];

export async function getConversation(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMessages(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, sender_id, sender_side, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}

export type MessageData = Awaited<ReturnType<typeof listMessages>>[number];

export async function getMyUnreadMessageCount() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_unread_message_count");
  return data ?? 0;
}

export async function getEntityUnreadMessageCount(entityId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("entity_unread_message_count", { p_entity: entityId });
  return data ?? 0;
}

/** Is this conversation unread for the given side? */
export function isUnread(c: Pick<ConversationData, "last_sender_side" | "last_message_at" | "user_last_read_at" | "entity_last_read_at">, side: "user" | "entity") {
  if (side === "user") {
    return c.last_sender_side === "entity" && (!c.user_last_read_at || c.last_message_at > c.user_last_read_at);
  }
  return c.last_sender_side === "user" && (!c.entity_last_read_at || c.last_message_at > c.entity_last_read_at);
}
