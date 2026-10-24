import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(page: number, pageSize = 20) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}
