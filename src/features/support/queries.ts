import "server-only";

import { createClient } from "@/lib/supabase/server";

const TICKET_FIELDS =
  "id, ticket_number, requester_id, entity_id, category, subject, status, priority, assigned_to, last_activity_at, resolved_at, created_at, entities(name), requester:profiles!support_tickets_requester_id_fkey(display_name, avatar_path), assignee:profiles!support_tickets_assigned_to_fkey(display_name)" as const;

export async function listMyTickets(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_FIELDS)
    .eq("requester_id", userId)
    .order("last_activity_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export type TicketData = Awaited<ReturnType<typeof listMyTickets>>[number];

export async function adminListTickets(filter: { status?: string; mine?: string; page?: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = filter.pageSize ?? 25;
  const page = filter.page ?? 1;
  let query = supabase.from("support_tickets").select(TICKET_FIELDS, { count: "exact" });
  if (filter.status === "active") query = query.in("status", ["open", "pending"]);
  else if (filter.status) query = query.eq("status", filter.status as "open");
  if (filter.mine) query = query.eq("assigned_to", filter.mine);
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query
    .order("last_activity_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getTicket(id: string) {
  const supabase = await createClient();
  const [{ data: ticket, error }, { data: messages }] = await Promise.all([
    supabase.from("support_tickets").select(TICKET_FIELDS).eq("id", id).maybeSingle(),
    supabase
      .from("support_ticket_messages")
      .select("id, author_id, is_staff, body, created_at, profiles(display_name, avatar_path)")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);
  if (error) throw error;
  return ticket ? { ticket, messages: messages ?? [] } : null;
}

export async function countOpenTickets() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}
