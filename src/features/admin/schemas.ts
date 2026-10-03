import { z } from "zod";

const reason = z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only.").max(80);

export const assignRoleSchema = z.object({
  userId: z.uuid(),
  roleKey: z.string().regex(/^[a-z_]{3,40}$/),
  scope: z.enum(["platform", "region", "district", "community"]),
  scopeId: z.union([z.uuid(), z.literal("")]).optional(),
  expiresAt: z.union([z.iso.date(), z.literal("")]).optional(),
}).refine((v) => v.scope === "platform" || Boolean(v.scopeId), { message: "Choose where this role applies.", path: ["scopeId"] });

export const accountStatusSchema = z.object({ userId: z.uuid(), status: z.enum(["active", "suspended", "deactivated"]), reason });

export const reviewApplicationSchema = z.object({
  applicationId: z.uuid(),
  action: z.enum(["start_review", "request_info", "approve", "reject", "note"]),
  note: z.string().trim().max(2000).optional(),
  internal: z.boolean().optional(),
}).refine((v) => !["request_info", "reject"].includes(v.action) || (v.note?.length ?? 0) >= 10, {
  message: "Explain your decision (at least 10 characters).",
  path: ["note"],
});

export const entityStatusSchema = z.object({ entityId: z.uuid(), status: z.enum(["active", "suspended", "archived"]), reason });
export const entityCapabilitySchema = z.object({
  entityId: z.uuid(),
  capability: z.enum(["posts", "products", "services", "jobs", "events", "media", "members", "analytics", "advertising", "orders", "emergency_alerts"]),
  enabled: z.boolean(),
});

export const MODERATION_TARGETS = ["post", "comment", "product", "service", "job", "event"] as const;
export const moderateSchema = z.object({
  targetType: z.enum(MODERATION_TARGETS),
  targetId: z.uuid(),
  action: z.enum(["approve", "hide", "remove", "restore"]),
  reason: z.string().trim().min(3, "Give a reason.").max(1000),
  reportId: z.uuid().optional(),
});
export const reportStatusSchema = z.object({ reportId: z.uuid(), status: z.enum(["reviewing", "resolved", "dismissed"]), note: z.string().trim().max(2000).optional() });
export const adReviewSchema = z.object({ adId: z.uuid(), decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(1000).optional() })
  .refine((v) => v.decision === "approved" || (v.note?.length ?? 0) >= 5, { message: "Give a reason for rejecting.", path: ["note"] });

export const regionSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(2).max(120), slug, isActive: z.boolean() });
export const districtSchema = regionSchema.extend({ regionId: z.uuid("Choose a region.") });
export const communitySchema = regionSchema.extend({ districtId: z.uuid("Choose a district."), description: z.string().trim().max(2000).optional() });

export const broadcastSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(140),
  body: z.string().trim().max(1000).optional(),
  link: z.union([z.string().regex(/^\/[A-Za-z0-9/_\-?=&.%]*$/, "Use an in-app path such as /events."), z.literal("")]).optional(),
  scope: z.enum(["platform", "region", "district", "community"]),
  scopeId: z.union([z.uuid(), z.literal("")]).optional(),
}).refine((v) => v.scope === "platform" || Boolean(v.scopeId), { message: "Choose an area.", path: ["scopeId"] });

export const settingSchema = z.object({ key: z.string().regex(/^[a-z_]+(\.[a-z_]+)*$/), value: z.string().max(2000) });

export const contactSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  service: z.enum(["police", "fire", "ambulance", "hospital", "disaster_management", "utility", "community_leader", "other"]),
  phone: z.string().trim().regex(/^\+?[0-9 ]{3,20}$/, "Enter a valid phone number."),
  notes: z.string().trim().max(300).optional(),
  scope: z.enum(["national", "region", "district", "community"]),
  scopeId: z.union([z.uuid(), z.literal("")]).optional(),
});

export const customRoleSchema = z.object({
  key: z.string().trim().regex(/^[a-z_]{3,40}$/, "3–40 lowercase letters or underscores."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  scopeLevel: z.enum(["platform", "region", "district", "community"]),
});
