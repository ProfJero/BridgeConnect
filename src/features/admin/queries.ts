import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/** All admin reads run as the administrator; RLS limits rows to their scope. */
export type PlatformStats = {
  residents: number;
  entities_by_type: Record<string, number>;
  pending_applications: number;
  open_reports: number;
  active_products: number;
  open_jobs: number;
  upcoming_events: number;
  orders_30d: number;
  active_alerts: number;
  pending_ads: number;
  daily: { day: string; signups: number; posts: number; orders: number }[];
};

export async function getPlatformStats(scope: { regionId?: string; districtId?: string; communityId?: string } = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_platform_stats", {
    p_region: scope.regionId,
    p_district: scope.districtId,
    p_community: scope.communityId,
  });
  if (error) return { stats: null, error };
  return { stats: data as unknown as PlatformStats, error: null };
}

export async function listUsers(params: { q?: string; status?: Enums["account_status"]; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: params.q,
    p_status: params.status,
    p_limit: pageSize,
    p_offset: (params.page - 1) * pageSize,
  });
  if (error) throw error;
  return { items: data ?? [], total: Number(data?.[0]?.total_count ?? 0), pageSize };
}

export async function getUserDetail(userId: string) {
  const supabase = await createClient();
  const [profile, assignments, memberships, audit] = await Promise.all([
    supabase.from("profiles").select("*, communities(name)").eq("id", userId).maybeSingle(),
    supabase
      .from("user_role_assignments")
      .select("id, created_at, expires_at, region_id, district_id, community_id, roles(key, name), regions(name), districts(name), communities(name)")
      .eq("user_id", userId),
    supabase.from("entity_memberships").select("id, role, entities(id, name, entity_type, status)").eq("user_id", userId),
    supabase.from("audit_logs").select("id, action, created_at, metadata").or(`actor_id.eq.${userId},target_id.eq.${userId}`).order("created_at", { ascending: false }).limit(20),
  ]);
  return {
    profile: profile.data,
    assignments: assignments.data ?? [],
    memberships: memberships.data ?? [],
    audit: audit.data ?? [],
  };
}

export async function getRolesWithPermissions() {
  const supabase = await createClient();
  const [roles, permissions, rolePermissions] = await Promise.all([
    supabase.from("roles").select("*").order("is_system", { ascending: false }).order("name"),
    supabase.from("permissions").select("*").order("category").order("key"),
    supabase.from("role_permissions").select("role_id, permission_key"),
  ]);
  return { roles: roles.data ?? [], permissions: permissions.data ?? [], rolePermissions: rolePermissions.data ?? [] };
}

export async function getLocationTree() {
  const supabase = await createClient();
  const [regions, districts, communities] = await Promise.all([
    supabase.from("regions").select("*").order("name"),
    supabase.from("districts").select("*").order("name"),
    supabase.from("communities").select("*").order("name"),
  ]);
  return { regions: regions.data ?? [], districts: districts.data ?? [], communities: communities.data ?? [] };
}

export async function listAdminEntities(params: { types: Enums["entity_type"][]; status?: Enums["entity_status"]; q?: string; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  let q = supabase
    .from("entities")
    .select("id, name, slug, entity_type, status, verified_at, communities(name, districts(name))", { count: "exact" })
    .in("entity_type", params.types);
  if (params.status) q = q.eq("status", params.status);
  if (params.q) q = q.ilike("name", `%${params.q.replace(/[%_]/g, "")}%`);
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("name").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function getAdminEntity(entityId: string) {
  const supabase = await createClient();
  const [entity, overrides, defaults, members, caps] = await Promise.all([
    supabase.from("entities").select("*, communities(name, districts(name))").eq("id", entityId).maybeSingle(),
    supabase.from("entity_capability_overrides").select("capability, enabled").eq("entity_id", entityId),
    supabase.from("entity_type_capabilities").select("entity_type, capability"),
    supabase.from("entity_memberships").select("id, role, profiles!entity_memberships_user_id_fkey(id, display_name)").eq("entity_id", entityId),
    supabase.rpc("entity_capabilities", { p_entity: entityId }),
  ]);
  return {
    entity: entity.data,
    overrides: overrides.data ?? [],
    defaults: defaults.data ?? [],
    members: members.data ?? [],
    capabilities: caps.data ?? [],
  };
}

export async function listApplications(params: { status?: Enums["application_status"]; kind?: "business" | "organisation"; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  let q = supabase
    .from("entity_applications")
    .select("id, proposed_name, entity_type, status, submitted_at, communities(name), profiles!entity_applications_applicant_id_fkey(display_name), application_documents(count)", { count: "exact" });
  if (params.status) q = q.eq("status", params.status);
  else q = q.in("status", ["submitted", "under_review", "info_requested"]);
  if (params.kind === "business") q = q.eq("entity_type", "business");
  if (params.kind === "organisation") q = q.neq("entity_type", "business");
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("submitted_at").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function listReports(params: { status?: Enums["report_status"]; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  let q = supabase
    .from("reports")
    .select(
      "id, reason, details, status, created_at, resolution_note, post_id, comment_id, entity_id, product_id, service_id, job_id, event_id, profile_id, communities(name), reporter:profiles!reports_reporter_id_fkey(display_name)",
      { count: "exact" },
    );
  q = params.status ? q.eq("status", params.status) : q.in("status", ["open", "reviewing"]);
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("created_at").range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function listModerationQueue() {
  const supabase = await createClient();
  const [held, hidden, actions] = await Promise.all([
    supabase.from("posts").select("id, title, body, status, moderation_reason, created_at, communities(name), profiles!posts_author_id_fkey(display_name)").eq("status", "pending_review").order("created_at").limit(50),
    supabase.from("posts").select("id, title, body, status, moderation_reason, created_at, communities(name), profiles!posts_author_id_fkey(display_name)").in("status", ["hidden", "removed"]).order("updated_at", { ascending: false }).limit(25),
    supabase.from("moderation_actions").select("id, action, target_type, target_id, reason, created_at, profiles(display_name)").order("created_at", { ascending: false }).limit(25),
  ]);
  return { held: held.data ?? [], hidden: hidden.data ?? [], actions: actions.data ?? [] };
}

export async function listAdminProducts(params: { q?: string; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  let q = supabase.from("products").select("id, name, slug, price, currency, status, created_at, entities(name)", { count: "exact" });
  if (params.q) q = q.ilike("name", `%${params.q.replace(/[%_]/g, "")}%`);
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function listAdminOrders(params: { status?: Enums["order_status"]; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 25;
  let q = supabase.from("orders").select("id, order_number, status, subtotal, currency, created_at, entities(name), profiles!orders_buyer_id_fkey(display_name)", { count: "exact" });
  if (params.status) q = q.eq("status", params.status);
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function listAdminJobs(page: number) {
  const supabase = await createClient();
  const from = (page - 1) * 25;
  const { data, count, error } = await supabase
    .from("jobs")
    .select("id, title, slug, status, created_at, entities(name), communities(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + 24);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize: 25 };
}

export async function listAdminEvents(page: number) {
  const supabase = await createClient();
  const from = (page - 1) * 25;
  const { data, count, error } = await supabase
    .from("events")
    .select("id, title, slug, status, starts_at, entities(name), communities(name)", { count: "exact" })
    .order("starts_at", { ascending: false })
    .range(from, from + 24);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize: 25 };
}

export async function listAdminAds(status?: Enums["ad_status"]) {
  const supabase = await createClient();
  let q = supabase.from("advertisements").select("*, entities(name, slug)");
  q = status ? q.eq("status", status) : q.eq("status", "pending_review");
  const { data, error } = await q.order("created_at").limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAdminAlerts() {
  const supabase = await createClient();
  const [alerts, contacts] = await Promise.all([
    supabase.from("emergency_alerts").select("*, regions(name), districts(name), communities(name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("emergency_contacts").select("*, regions(name), districts(name), communities(name)").order("sort_order"),
  ]);
  return { alerts: alerts.data ?? [], contacts: contacts.data ?? [] };
}

export async function listAuditLogs(params: { action?: string; page: number; pageSize?: number }) {
  const supabase = await createClient();
  const pageSize = params.pageSize ?? 50;
  let q = supabase.from("audit_logs").select("id, action, target_table, target_id, metadata, created_at, profiles(display_name)", { count: "exact" });
  if (params.action) q = q.ilike("action", `${params.action.replace(/[%_]/g, "")}%`);
  const from = (params.page - 1) * pageSize;
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0, pageSize };
}

export async function listSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("platform_settings").select("*").order("key");
  if (error) throw error;
  return data ?? [];
}
