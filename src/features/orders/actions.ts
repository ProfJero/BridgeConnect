"use server";

import { revalidatePath } from "next/cache";

import { success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { placeOrderSchema, updateOrderStatusSchema } from "./schemas";

export async function placeOrderAction(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_entity: parsed.data.entityId,
    p_items: [{ product_id: parsed.data.productId, quantity: parsed.data.quantity }],
    p_fulfilment: parsed.data.fulfilment,
    p_contact_phone: parsed.data.contactPhone,
    p_delivery_address: parsed.data.deliveryAddress || undefined,
    p_note: parsed.data.note || undefined,
  });
  if (error) return dbFailure(error, "orders.place");
  revalidatePath("/orders");
  return success("Order placed. The seller has been notified.", { orderId: data });
}

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order: parsed.data.orderId,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return dbFailure(error, "orders.updateStatus");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  return success("Order updated.");
}
