"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { canAnywhere, type Permission } from "@/lib/auth/permissions";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import {
  accountStatusSchema,
  adReviewSchema,
  assignRoleSchema,
  broadcastSchema,
  communitySchema,
  contactSchema,
  customRoleSchema,
  districtSchema,
  entityCapabilitySchema,
  entityStatusSchema,
  moderateSchema,
  regionSchema,
  reportStatusSchema,
  reviewApplicationSchema,
  settingSchema,
} from "./schemas";

/**
 * Coarse gate for admin actions. Scope (which region/district/community the
 * admin may act in) is enforced by the database function or RLS policy behind
 * every call below — never by this check alone.
 */
async function guardAdmin(permission: Permission) {
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth;
  if (!canAnywhere(auth.viewer.grants, "admin.access") || !canAnywhere(auth.viewer.grants, permission)) {
    return { ok: false as const, result: failure("You don't have permission to do that.") };
  }
  return auth;
}

// Users & roles ---------------------------------------------------------------
export async function assignRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = assignRoleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("roles.assign");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_role", {
    p_user: v.userId,
    p_role_key: v.roleKey,
    p_region: v.scope === "region" ? v.scopeId || undefined : undefined,
    p_district: v.scope === "district" ? v.scopeId || undefined : undefined,
    p_community: v.scope === "community" ? v.scopeId || undefined : undefined,
    p_expires_at: v.expiresAt ? new Date(`${v.expiresAt}T23:59:59Z`).toISOString() : undefined,
  });
  if (error) return dbFailure(error, "admin.assignRole");
  revalidatePath(`/admin/users/${v.userId}`);
  return success("Role assigned.");
}

export async function revokeRoleAction(assignmentId: string, userId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(assignmentId).success || !z.uuid().safeParse(userId).success) return failure("Invalid request.");
  const guard = await guardAdmin("roles.assign");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_role", { p_assignment: assignmentId });
  if (error) return dbFailure(error, "admin.revokeRole");
  revalidatePath(`/admin/users/${userId}`);
  return success("Role revoked.");
}

export async function setAccountStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = accountStatusSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("users.manage");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_account_status", { p_user: parsed.data.userId, p_status: parsed.data.status, p_reason: parsed.data.reason });
  if (error) return dbFailure(error, "admin.setAccountStatus");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return success("Account updated.");
}

export async function createCustomRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = customRoleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("roles.manage");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("roles").insert({ key: v.key, name: v.name, description: v.description || null, scope_level: v.scopeLevel });
  if (error) return dbFailure(error, "admin.createRole");
  revalidatePath("/admin/roles");
  return success("Role created.");
}

export async function toggleRolePermissionAction(roleId: string, permissionKey: string, enabled: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(roleId).success || !/^[a-z_]+\.[a-z_]+$/.test(permissionKey)) return failure("Invalid request.");
  const guard = await guardAdmin("roles.manage");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = enabled
    ? await supabase.from("role_permissions").insert({ role_id: roleId, permission_key: permissionKey })
    : await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_key", permissionKey);
  if (error) return dbFailure(error, "admin.toggleRolePermission");
  revalidatePath("/admin/roles");
  return success(enabled ? "Permission granted." : "Permission removed.");
}

// Verification & entities ----------------------------------------------------
export async function reviewApplicationAction(input: unknown): Promise<ActionResult<{ entityId: string | null }>> {
  const parsed = reviewApplicationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("entities.verify");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_entity_application", {
    p_application: v.applicationId,
    p_action: v.action,
    p_note: v.note || undefined,
    p_internal: v.internal ?? v.action === "note",
  });
  if (error) return dbFailure(error, "admin.reviewApplication");
  revalidatePath(`/admin/verification/${v.applicationId}`);
  revalidatePath("/admin/verification");
  const messages = { start_review: "Review started.", request_info: "Information requested.", approve: "Approved — workspace created.", reject: "Application rejected.", note: "Note added." };
  return success(messages[v.action], { entityId: data ?? null });
}

export async function setEntityStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = entityStatusSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("entities.manage");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_entity_status", { p_entity: parsed.data.entityId, p_status: parsed.data.status, p_reason: parsed.data.reason });
  if (error) return dbFailure(error, "admin.setEntityStatus");
  revalidatePath(`/admin/entities/${parsed.data.entityId}`);
  return success("Entity updated.");
}

export async function setEntityCapabilityAction(input: unknown): Promise<ActionResult> {
  const parsed = entityCapabilitySchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const guard = await guardAdmin("entities.manage");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_entity_capability", { p_entity: parsed.data.entityId, p_capability: parsed.data.capability, p_enabled: parsed.data.enabled });
  if (error) return dbFailure(error, "admin.setEntityCapability");
  revalidatePath(`/admin/entities/${parsed.data.entityId}`);
  return success("Capability updated.");
}

// Trust & safety ---------------------------------------------------------------
export async function moderateAction(input: unknown): Promise<ActionResult> {
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  if (!auth.viewer.isAdmin) return failure("You don't have permission to do that.");
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_content", {
    p_target_type: v.targetType,
    p_target: v.targetId,
    p_action: v.action,
    p_reason: v.reason,
    p_report: v.reportId,
  });
  if (error) return dbFailure(error, "admin.moderate");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/reports");
  return success("Moderation action recorded.");
}

export async function updateReportStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = reportStatusSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const guard = await guardAdmin("content.moderate");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_report_status", { p_report: parsed.data.reportId, p_status: parsed.data.status, p_note: parsed.data.note || undefined });
  if (error) return dbFailure(error, "admin.reportStatus");
  revalidatePath("/admin/reports");
  return success("Report updated.");
}

export async function reviewAdAction(input: unknown): Promise<ActionResult> {
  const parsed = adReviewSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("ads.review");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_advertisement", { p_ad: parsed.data.adId, p_decision: parsed.data.decision, p_note: parsed.data.note || undefined });
  if (error) return dbFailure(error, "admin.reviewAd");
  revalidatePath("/admin/advertisements");
  return success(parsed.data.decision === "approved" ? "Advertisement approved." : "Advertisement rejected.");
}

// Locations -------------------------------------------------------------------
export async function saveRegionAction(input: unknown): Promise<ActionResult> {
  const parsed = regionSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("locations.manage");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, slug: v.slug, is_active: v.isActive };
  const { error } = v.id ? await supabase.from("regions").update(row).eq("id", v.id) : await supabase.from("regions").insert(row);
  if (error) return dbFailure(error, "admin.saveRegion");
  revalidatePath("/admin/locations");
  return success("Region saved.");
}

export async function saveDistrictAction(input: unknown): Promise<ActionResult> {
  const parsed = districtSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("locations.manage");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, slug: v.slug, is_active: v.isActive, region_id: v.regionId };
  const { error } = v.id ? await supabase.from("districts").update(row).eq("id", v.id) : await supabase.from("districts").insert(row);
  if (error) return dbFailure(error, "admin.saveDistrict");
  revalidatePath("/admin/locations");
  return success("District saved.");
}

export async function saveCommunityAction(input: unknown): Promise<ActionResult> {
  const parsed = communitySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("locations.manage");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const row = { name: v.name, slug: v.slug, is_active: v.isActive, district_id: v.districtId, description: v.description || null };
  const { error } = v.id ? await supabase.from("communities").update(row).eq("id", v.id) : await supabase.from("communities").insert(row);
  if (error) return dbFailure(error, "admin.saveCommunity");
  revalidatePath("/admin/locations");
  return success("Community saved.");
}

// Notifications, settings, emergency -------------------------------------------
export async function broadcastAction(input: unknown): Promise<ActionResult> {
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("notifications.broadcast");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_broadcast_notification", {
    p_title: v.title,
    p_body: v.body || "",
    p_link: v.link || undefined,
    p_region: v.scope === "region" ? v.scopeId || undefined : undefined,
    p_district: v.scope === "district" ? v.scopeId || undefined : undefined,
    p_community: v.scope === "community" ? v.scopeId || undefined : undefined,
  });
  if (error) return dbFailure(error, "admin.broadcast");
  return success(`Sent to ${data ?? 0} residents.`);
}

export async function updateSettingAction(input: unknown): Promise<ActionResult> {
  const parsed = settingSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid setting.");
  const guard = await guardAdmin("settings.manage");
  if (!guard.ok) return guard.result;
  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value);
  } catch {
    return failure("Enter a valid value (JSON: numbers, true/false or \"quoted text\").");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("platform_settings").update({ value: value as never }).eq("key", parsed.data.key).select("key");
  if (error) return dbFailure(error, "admin.updateSetting");
  if (!data?.length) return failure("Setting not found.");
  revalidatePath("/admin/settings");
  return success("Setting saved.");
}

export async function saveContactAction(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const guard = await guardAdmin("emergency.publish");
  if (!guard.ok) return guard.result;
  const v = parsed.data;
  const supabase = await createClient();
  const row = {
    name: v.name,
    service: v.service,
    phone: v.phone,
    notes: v.notes || null,
    region_id: v.scope === "region" ? v.scopeId || null : null,
    district_id: v.scope === "district" ? v.scopeId || null : null,
    community_id: v.scope === "community" ? v.scopeId || null : null,
  };
  const { error } = v.id ? await supabase.from("emergency_contacts").update(row).eq("id", v.id) : await supabase.from("emergency_contacts").insert(row);
  if (error) return dbFailure(error, "admin.saveContact");
  revalidatePath("/admin/emergency");
  return success("Contact saved.");
}

export async function toggleContactAction(id: string, isActive: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return failure("Invalid request.");
  const guard = await guardAdmin("emergency.publish");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("emergency_contacts").update({ is_active: isActive }).eq("id", id).select("id");
  if (error) return dbFailure(error, "admin.toggleContact");
  if (!data?.length) return failure("You can't change this contact.");
  revalidatePath("/admin/emergency");
  return success(isActive ? "Contact shown." : "Contact hidden.");
}
