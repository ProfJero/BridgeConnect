import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const TRIP_FIELDS =
  "id, trip_number, kind, vehicle_type, customer_id, rider_id, community_id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, package_description, recipient_name, recipient_phone, customer_phone, order_id, note, payment_method, offered_fare, final_fare, currency, status, cancel_reason, cancelled_by, accepted_at, arrived_at, started_at, completed_at, cancelled_at, customer_rating, rated_at, created_at, communities(name), rider:profiles!trips_rider_id_fkey(display_name, avatar_path), customer:profiles!trips_customer_id_fkey(display_name, avatar_path)" as const;

export async function getTrip(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("trips").select(TRIP_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type TripData = NonNullable<Awaited<ReturnType<typeof getTrip>>>;

export async function getRiderPublic(riderId: string | null) {
  if (!riderId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("rider_profiles")
    .select("vehicle_type, vehicle_description, plate_number, phone, whatsapp, rating_avg, rating_count, completed_trips")
    .eq("user_id", riderId)
    .maybeSingle();
  return data;
}

export async function listMyTrips(userId: string, opts: { active?: boolean; limit?: number } = {}) {
  const supabase = await createClient();
  let query = supabase.from("trips").select(TRIP_FIELDS).eq("customer_id", userId);
  if (opts.active) query = query.in("status", ["requested", "accepted", "arrived", "in_progress"]);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (error) throw error;
  return data ?? [];
}

export async function listRiderTrips(riderId: string, opts: { active?: boolean; limit?: number } = {}) {
  const supabase = await createClient();
  let query = supabase.from("trips").select(TRIP_FIELDS).eq("rider_id", riderId);
  if (opts.active) query = query.in("status", ["accepted", "arrived", "in_progress"]);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(opts.limit ?? 50);
  if (error) throw error;
  return data ?? [];
}

export async function getMyRiderProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rider_profiles")
    .select("user_id, vehicle_type, vehicle_description, plate_number, offers_rides, offers_delivery, community_id, service_area, phone, whatsapp, bio, status, status_reason, is_online, rating_avg, rating_count, completed_trips, communities(name)")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function listOpenRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_trip_requests");
  if (error) throw error;
  return data ?? [];
}

export async function listAvailableRiders(communityId: string, kind?: Enums["trip_kind"], vehicle?: Enums["vehicle_type"]) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("available_riders", { p_community: communityId, p_kind: kind, p_vehicle: vehicle });
  if (error) throw error;
  return data ?? [];
}

export async function adminListRiders(status?: Enums["rider_status"]) {
  const supabase = await createClient();
  let query = supabase
    .from("rider_profiles")
    .select("user_id, vehicle_type, vehicle_description, plate_number, offers_rides, offers_delivery, phone, status, status_reason, is_online, rating_avg, rating_count, completed_trips, created_at, communities(name), profiles!rider_profiles_user_id_fkey(display_name, avatar_path)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Earnings summary for the rider dashboard (completed trips in rolling windows). */
export function summariseEarnings(trips: { status: string; completed_at: string | null; final_fare: number | null; customer_rating: number | null }[]) {
  const now = Date.now();
  const done = trips.filter((t) => t.status === "completed");
  const within = (days: number) =>
    done.filter((t) => t.completed_at && now - Date.parse(t.completed_at) <= days * 86_400_000).reduce((s, t) => s + Number(t.final_fare ?? 0), 0);
  const rated = done.filter((t) => t.customer_rating);
  return {
    week: within(7),
    month: within(30),
    completed: done.length,
    rating: rated.length ? rated.reduce((s, t) => s + (t.customer_rating ?? 0), 0) / rated.length : null,
    ratings: rated.length,
  };
}
