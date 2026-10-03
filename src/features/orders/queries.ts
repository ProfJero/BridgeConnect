import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function listMyOrders(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, subtotal, currency, created_at, entities(name, slug)")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

/** Order with items and history. RLS: buyer, seller staff or scoped admins only. */
export async function getOrder(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "*, entities(id, name, slug, phone), profiles!orders_buyer_id_fkey(display_name), order_items(id, product_name, unit_price, quantity, line_total), order_status_history(id, status, note, created_at)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
