import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AlertRow = Awaited<ReturnType<typeof getAlertsForCommunity>>[number];

/** Alerts for a community (its own, district and region), most severe first. */
export async function getAlertsForCommunity(communityId: string, includeClosed = false) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("alerts_for_community", {
    p_community: communityId,
    p_include_closed: includeClosed,
  });
  if (error) throw error;
  return data ?? [];
}

/** Active alerts everywhere (for visitors without a home community). */
export async function getActiveAlerts(limit = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emergency_alerts")
    .select("*")
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("starts_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getAlert(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("emergency_alerts").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getEmergencyContacts(target: { communityId?: string | null; districtId?: string | null; regionId?: string | null }) {
  const supabase = await createClient();
  const filters = ["and(region_id.is.null,district_id.is.null,community_id.is.null)"];
  if (target.regionId) filters.push(`region_id.eq.${target.regionId}`);
  if (target.districtId) filters.push(`district_id.eq.${target.districtId}`);
  if (target.communityId) filters.push(`community_id.eq.${target.communityId}`);
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("is_active", true)
    .or(filters.join(","))
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}
