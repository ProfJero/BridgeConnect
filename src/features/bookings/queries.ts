import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { BookingStatus } from "./schemas";

const BOOKING_FIELDS =
  "id, booking_number, service_id, entity_id, customer_id, requested_date, requested_time, customer_note, contact_phone, status, entity_note, created_at, updated_at, services(name, slug), entities(name, slug, logo_path), profiles!service_bookings_customer_id_fkey(display_name, avatar_path)" as const;

export async function listMyBookings(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_bookings")
    .select(BOOKING_FIELDS)
    .eq("customer_id", userId)
    .order("requested_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listEntityBookings(entityId: string, status?: BookingStatus) {
  const supabase = await createClient();
  let query = supabase.from("service_bookings").select(BOOKING_FIELDS).eq("entity_id", entityId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query
    .order("requested_date", { ascending: true })
    .order("requested_time", { ascending: true, nullsFirst: true })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export type BookingData = Awaited<ReturnType<typeof listMyBookings>>[number];

export async function countPendingBookings(entityId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("service_bookings")
    .select("id", { count: "exact", head: true })
    .eq("entity_id", entityId)
    .eq("status", "requested");
  return count ?? 0;
}
