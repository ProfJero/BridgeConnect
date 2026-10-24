"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { canUseCapability, hasMembershipRole, type EntityCapability, type MembershipRole } from "@/lib/auth/permissions";
import { dbFailure } from "@/lib/errors";
import { JOB_APPLICATIONS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import {
  addMemberSchema,
  adSchema,
  alertSchema,
  entityProfileSchema,
  eventSchema,
  jobSchema,
  MEMBER_ROLES,
  productSchema,
  serviceSchema,
} from "./schemas";

/**
 * Early, user-friendly workspace check for actions. The database enforces the
 * same rule (private.entity_can) on every write, so this is not the boundary.
 */
async function guardWorkspace(entityId: string, capability: EntityCapability | null, minRole: MembershipRole = "editor") {
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth;
  const membership = auth.viewer.workspaces.find((w) => w.entityId === entityId);
  if (!membership || membership.status !== "active") return { ok: false as const, result: failure("You don't have access to this workspace.") };
  if (capability) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("entity_capabilities", { p_entity: entityId });
    if (!canUseCapability((data ?? []) as EntityCapability[], membership.role, capability)) {
      return { ok: false as const, result: failure("Your role doesn't allow this.") };
    }
  } else if (!hasMembershipRole(membership.role, minRole)) {
    return { ok: false as const, result: failure("Your role doesn't allow this.") };
  }
  return { ok: true as const, viewer: auth.viewer, role: membership.role };
}

const nullIfEmpty = <T,>(v: T | "" | undefined | null) => (v === "" || v === undefined ? null : v);

// ---------------------------------------------------------------------------
// Entity profile
// ---------------------------------------------------------------------------
export async function updateEntityProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = entityProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, null, "manager");
  if (!guard.ok) return guard.result;
  const prefix = `entities/${v.entityId}/`;
  if ((v.logoPath && !v.logoPath.startsWith(prefix)) || (v.coverPath && !v.coverPath.startsWith(prefix))) {
    return failure("Invalid image.");
  }
  const supabase = await createClient();
  const { data: entity, error } = await supabase
    .from("entities")
    .update({
      tagline: nullIfEmpty(v.tagline),
      description: nullIfEmpty(v.description),
      address: nullIfEmpty(v.address),
      phone: nullIfEmpty(v.phone),
      whatsapp: nullIfEmpty(v.whatsapp),
      email: nullIfEmpty(v.email),
      website: nullIfEmpty(v.website),
      opening_hours: v.openingHours ?? null,
      ...(v.logoPath !== undefined ? { logo_path: v.logoPath } : {}),
      ...(v.coverPath !== undefined ? { cover_path: v.coverPath } : {}),
    })
    .eq("id", v.entityId)
    .select("entity_type, slug")
    .single();
  if (error) return dbFailure(error, "workspace.updateProfile");

  const year = v.yearEstablished === "" || v.yearEstablished === undefined ? null : v.yearEstablished;
  const { error: detailError } =
    entity.entity_type === "business"
      ? await supabase
          .from("business_profiles")
          .update({ year_established: year, delivery_available: v.deliveryAvailable ?? false, accepts_mobile_money: v.acceptsMobileMoney ?? false })
          .eq("entity_id", v.entityId)
      : await supabase
          .from("organisation_profiles")
          .update({ year_established: year, mission: nullIfEmpty(v.mission), beneficiaries: nullIfEmpty(v.beneficiaries) })
          .eq("entity_id", v.entityId);
  if (detailError) return dbFailure(detailError, "workspace.updateProfileDetails");
  revalidatePath(`/directory/${entity.slug}`);
  revalidatePath(`/workspace/${v.entityId}`, "layout");
  return success("Profile updated.");
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function saveProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "products");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const row = {
    name: v.name,
    category_id: nullIfEmpty(v.categoryId),
    description: nullIfEmpty(v.description),
    price: v.price,
    unit: nullIfEmpty(v.unit),
    stock_quantity: v.stockQuantity === "" || v.stockQuantity === undefined ? null : v.stockQuantity,
    status: v.status,
  };
  const { data, error } = v.productId
    ? await supabase.from("products").update(row).eq("id", v.productId).eq("entity_id", v.entityId).select("id").single()
    : await supabase.from("products").insert({ ...row, entity_id: v.entityId }).select("id").single();
  if (error) return dbFailure(error, "workspace.saveProduct");

  if (v.mediaIds) {
    await supabase.from("product_media").delete().eq("product_id", data.id);
    if (v.mediaIds.length) {
      const { error: mediaError } = await supabase
        .from("product_media")
        .insert(v.mediaIds.map((media_id, position) => ({ product_id: data.id, media_id, position })));
      if (mediaError) return dbFailure(mediaError, "workspace.productMedia");
    }
  }
  revalidatePath(`/workspace/${v.entityId}/products`);
  revalidatePath("/marketplace");
  return success(v.productId ? "Product updated." : "Product created.", { id: data.id });
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export async function saveServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "services");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const row = {
    name: v.name,
    category_id: nullIfEmpty(v.categoryId),
    description: nullIfEmpty(v.description),
    price_from: v.priceFrom === "" || v.priceFrom === undefined ? null : v.priceFrom,
    price_note: nullIfEmpty(v.priceNote),
    service_area: nullIfEmpty(v.serviceArea),
    status: v.status,
  };
  const { data, error } = v.serviceId
    ? await supabase.from("services").update(row).eq("id", v.serviceId).eq("entity_id", v.entityId).select("id").single()
    : await supabase.from("services").insert({ ...row, entity_id: v.entityId }).select("id").single();
  if (error) return dbFailure(error, "workspace.saveService");
  revalidatePath(`/workspace/${v.entityId}/services`);
  return success(v.serviceId ? "Service updated." : "Service created.", { id: data.id });
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function saveJobAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "jobs");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const row = {
    title: v.title,
    category_id: nullIfEmpty(v.categoryId),
    description: v.description,
    requirements: nullIfEmpty(v.requirements),
    employment_type: v.employmentType,
    location_note: nullIfEmpty(v.locationNote),
    salary_min: v.salaryMin === "" || v.salaryMin === undefined ? null : v.salaryMin,
    salary_max: v.salaryMax === "" || v.salaryMax === undefined ? null : v.salaryMax,
    salary_period: nullIfEmpty(v.salaryPeriod),
    application_deadline: nullIfEmpty(v.applicationDeadline),
    status: v.status,
  };
  const { data, error } = v.jobId
    ? await supabase.from("jobs").update(row).eq("id", v.jobId).eq("entity_id", v.entityId).select("id").single()
    : await supabase.from("jobs").insert({ ...row, entity_id: v.entityId, community_id: v.communityId }).select("id").single();
  if (error) return dbFailure(error, "workspace.saveJob");
  revalidatePath(`/workspace/${v.entityId}/jobs`);
  revalidatePath("/jobs");
  return success(v.jobId ? "Job updated." : "Job created.", { id: data.id });
}

const applicantStatusSchema = z.object({
  entityId: z.uuid(),
  jobId: z.uuid(),
  applicationId: z.uuid(),
  status: z.enum(["reviewing", "shortlisted", "rejected", "hired"]),
  note: z.string().trim().max(2000).optional(),
});

export async function setApplicantStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = applicantStatusSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "jobs");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_job_application_status", {
    p_application: v.applicationId,
    p_status: v.status,
    p_note: v.note || undefined,
  });
  if (error) return dbFailure(error, "workspace.applicantStatus");
  revalidatePath(`/workspace/${v.entityId}/jobs/${v.jobId}`);
  return success("Applicant updated.");
}

/** Short-lived link to an applicant's CV (Storage RLS limits to employer editors). */
export async function getCvLinkAction(entityId: string, cvPath: string): Promise<ActionResult<{ url: string }>> {
  if (!z.uuid().safeParse(entityId).success || cvPath.length > 500) return failure("Invalid request.");
  const guard = await guardWorkspace(entityId, "jobs");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(JOB_APPLICATIONS_BUCKET).createSignedUrl(cvPath, 120);
  if (error || !data) return failure("The CV could not be opened.");
  return success(undefined, { url: data.signedUrl });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export async function saveEventAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "events");
  if (!guard.ok) return guard.result;
  if (v.coverPath && !v.coverPath.startsWith(`entities/${v.entityId}/`)) return failure("Invalid image.");
  const supabase = await createClient();
  const toIso = (local: string) => new Date(local).toISOString();
  const row = {
    title: v.title,
    category_id: nullIfEmpty(v.categoryId),
    description: v.description,
    is_online: v.isOnline,
    venue: nullIfEmpty(v.venue),
    online_url: nullIfEmpty(v.onlineUrl),
    starts_at: toIso(v.startsAt),
    ends_at: v.endsAt ? toIso(v.endsAt) : null,
    capacity: v.capacity === "" || v.capacity === undefined ? null : v.capacity,
    status: v.status,
    ...(v.coverPath !== undefined ? { cover_path: v.coverPath } : {}),
  };
  const { data, error } = v.eventId
    ? await supabase.from("events").update(row).eq("id", v.eventId).eq("entity_id", v.entityId).select("id").single()
    : await supabase.from("events").insert({ ...row, entity_id: v.entityId, community_id: v.communityId }).select("id").single();
  if (error) return dbFailure(error, "workspace.saveEvent");
  revalidatePath(`/workspace/${v.entityId}/events`);
  revalidatePath("/events");
  return success(v.eventId ? "Event updated." : "Event created.", { id: data.id });
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export async function deleteEntityMediaAction(entityId: string, mediaId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(entityId).success || !z.uuid().safeParse(mediaId).success) return failure("Invalid request.");
  const guard = await guardWorkspace(entityId, "media");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("media_assets").delete().eq("id", mediaId).eq("entity_id", entityId).select("storage_path");
  if (error) return dbFailure(error, "workspace.deleteMedia");
  if (data?.length) await supabase.storage.from("public-media").remove(data.map((d) => d.storage_path));
  revalidatePath(`/workspace/${entityId}/media`);
  return success("Image deleted.");
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function addMemberAction(input: unknown): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "members");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("entity_add_member", { p_entity: v.entityId, p_email: v.email, p_role: v.role });
  if (error) return dbFailure(error, "workspace.addMember");
  revalidatePath(`/workspace/${v.entityId}/members`);
  return success("Member added.");
}

const memberRoleSchema = z.object({ entityId: z.uuid(), membershipId: z.uuid(), role: z.enum(MEMBER_ROLES) });

export async function updateMemberRoleAction(input: unknown): Promise<ActionResult> {
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const guard = await guardWorkspace(parsed.data.entityId, "members");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("entity_update_member_role", { p_membership: parsed.data.membershipId, p_role: parsed.data.role });
  if (error) return dbFailure(error, "workspace.updateMemberRole");
  revalidatePath(`/workspace/${parsed.data.entityId}/members`);
  return success("Role updated.");
}

export async function removeMemberAction(entityId: string, membershipId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(entityId).success || !z.uuid().safeParse(membershipId).success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("entity_remove_member", { p_membership: membershipId });
  if (error) return dbFailure(error, "workspace.removeMember");
  revalidatePath(`/workspace/${entityId}/members`);
  return success("Member removed.");
}

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------
export async function saveAdAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = adSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const guard = await guardWorkspace(v.entityId, "advertising");
  if (!guard.ok) return guard.result;
  if (v.imagePath && !v.imagePath.startsWith(`entities/${v.entityId}/`)) return failure("Invalid image.");
  const supabase = await createClient();
  const row = {
    title: v.title,
    body: nullIfEmpty(v.body),
    link_path: nullIfEmpty(v.linkPath),
    placement: v.placement,
    target_community_id: nullIfEmpty(v.targetCommunityId),
    starts_on: v.startsOn,
    ends_on: v.endsOn,
    status: v.submit ? ("pending_review" as const) : ("draft" as const),
    ...(v.imagePath !== undefined ? { image_path: v.imagePath } : {}),
  };
  const { data, error } = v.adId
    ? await supabase.from("advertisements").update(row).eq("id", v.adId).eq("entity_id", v.entityId).select("id").single()
    : await supabase.from("advertisements").insert({ ...row, entity_id: v.entityId }).select("id").single();
  if (error) return dbFailure(error, "workspace.saveAd");
  revalidatePath(`/workspace/${v.entityId}/ads`);
  return success(v.submit ? "Submitted for review." : "Draft saved.", { id: data.id });
}

const adStatusSchema = z.object({ entityId: z.uuid(), adId: z.uuid(), status: z.enum(["paused", "approved", "archived"]) });

export async function setAdStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = adStatusSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const guard = await guardWorkspace(parsed.data.entityId, "advertising");
  if (!guard.ok) return guard.result;
  const supabase = await createClient();
  // The database only permits resume (paused → approved), pause and archive here.
  const { error } = await supabase.from("advertisements").update({ status: parsed.data.status }).eq("id", parsed.data.adId);
  if (error) return dbFailure(error, "workspace.adStatus");
  revalidatePath(`/workspace/${parsed.data.entityId}/ads`);
  return success("Advertisement updated.");
}

// ---------------------------------------------------------------------------
// Emergency alerts (entities with the capability, e.g. health facilities)
// ---------------------------------------------------------------------------
export async function issueAlertAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = alertSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  if (v.entityId) {
    const guard = await guardWorkspace(v.entityId, "emergency_alerts");
    if (!guard.ok) return guard.result;
  } else {
    const auth = await guardActiveViewer();
    if (!auth.ok) return auth.result;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_emergency_alert", {
    p_title: v.title,
    p_body: v.body,
    p_severity: v.severity,
    p_category: v.category,
    p_instructions: v.instructions || undefined,
    p_region: v.scope === "region" ? v.scopeId : undefined,
    p_district: v.scope === "district" ? v.scopeId : undefined,
    p_community: v.scope === "community" ? v.scopeId : undefined,
    p_expires_at: v.expiresAt ? new Date(v.expiresAt).toISOString() : undefined,
    p_entity: v.entityId,
  });
  if (error) return dbFailure(error, "alerts.issue");
  revalidatePath("/emergency");
  return success("Alert published.", { id: data });
}

export async function closeAlertAction(alertId: string, status: "resolved" | "cancelled"): Promise<ActionResult> {
  if (!z.uuid().safeParse(alertId).success || !["resolved", "cancelled"].includes(status)) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_emergency_alert_status", { p_alert: alertId, p_status: status });
  if (error) return dbFailure(error, "alerts.close");
  revalidatePath("/emergency");
  revalidatePath("/admin/emergency");
  return success(status === "resolved" ? "Alert marked resolved." : "Alert cancelled.");
}
