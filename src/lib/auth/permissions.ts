/**
 * Pure authorization model shared by server code and UI.
 *
 * These functions mirror the database helpers (private.has_permission,
 * private.entity_can, …) so the UI can decide what to SHOW. They are never
 * the security boundary: every mutation is re-checked by server actions and
 * enforced by PostgreSQL RLS / SECURITY DEFINER functions.
 */
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const PERMISSIONS = [
  "admin.access",
  "users.read",
  "users.manage",
  "roles.read",
  "roles.assign",
  "roles.manage",
  "locations.manage",
  "entities.read_all",
  "entities.verify",
  "entities.manage",
  "content.moderate",
  "reports.read",
  "marketplace.manage",
  "orders.read_all",
  "jobs.manage",
  "events.manage",
  "ads.review",
  "emergency.publish",
  "analytics.read",
  "notifications.broadcast",
  "audit.read",
  "settings.manage",
  "platform.owner",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type ScopeLevel = Enums["scope_level"];
export type MembershipRole = Enums["membership_role"];
export type EntityCapability = Enums["entity_capability"];

/** One effective permission grant, as returned by `public.my_access()`. */
export type PermissionGrant = {
  permission: Permission;
  scope: ScopeLevel;
  regionId: string | null;
  districtId: string | null;
  communityId: string | null;
};

/** A fully resolved location. Pass every level you know. */
export type LocationTarget = {
  regionId?: string | null;
  districtId?: string | null;
  communityId?: string | null;
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** Does a single grant cover the target location? Mirrors private.has_permission. */
export function grantCovers(grant: PermissionGrant, target?: LocationTarget): boolean {
  if (grant.scope === "platform") return true;
  if (!target) return false;
  switch (grant.scope) {
    case "region":
      return Boolean(target.regionId) && grant.regionId === target.regionId;
    case "district":
      return Boolean(target.districtId) && grant.districtId === target.districtId;
    case "community":
      return Boolean(target.communityId) && grant.communityId === target.communityId;
  }
}

/** Holds `permission` at a scope covering `target` (platform-wide if no target). */
export function can(
  grants: readonly PermissionGrant[],
  permission: Permission,
  target?: LocationTarget,
): boolean {
  return grants.some((g) => g.permission === permission && grantCovers(g, target));
}

/** Holds `permission` at any scope (used to show admin navigation). */
export function canAnywhere(grants: readonly PermissionGrant[], permission: Permission): boolean {
  return grants.some((g) => g.permission === permission);
}

/** Broadest scope at which the user holds `permission`, or null. */
export function broadestScope(
  grants: readonly PermissionGrant[],
  permission: Permission,
): ScopeLevel | null {
  const order: ScopeLevel[] = ["platform", "region", "district", "community"];
  const held = grants.filter((g) => g.permission === permission).map((g) => g.scope);
  return order.find((level) => held.includes(level)) ?? null;
}

// ---------------------------------------------------------------------------
// Entity workspace roles
// ---------------------------------------------------------------------------
const MEMBERSHIP_RANK: Record<MembershipRole, number> = {
  owner: 4,
  manager: 3,
  editor: 2,
  member: 1,
};

export function membershipRank(role: MembershipRole): number {
  return MEMBERSHIP_RANK[role];
}

export function hasMembershipRole(role: MembershipRole | null | undefined, min: MembershipRole) {
  return role ? MEMBERSHIP_RANK[role] >= MEMBERSHIP_RANK[min] : false;
}

/** Roles a member with `actorRole` may grant to others (mirrors entity_add_member). */
export function grantableRoles(actorRole: MembershipRole): MembershipRole[] {
  const all: MembershipRole[] = ["owner", "manager", "editor", "member"];
  if (actorRole === "owner") return all;
  return all.filter((r) => MEMBERSHIP_RANK[r] < MEMBERSHIP_RANK[actorRole]);
}

/** Can `actorRole` change or remove a member who currently holds `targetRole`? */
export function canManageMember(actorRole: MembershipRole, targetRole: MembershipRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole !== "manager") return false;
  return MEMBERSHIP_RANK[targetRole] < MEMBERSHIP_RANK[actorRole];
}

/** Minimum workspace role required to use each module. */
export const CAPABILITY_MIN_ROLE: Record<EntityCapability, MembershipRole> = {
  posts: "editor",
  products: "editor",
  services: "editor",
  jobs: "editor",
  events: "editor",
  media: "editor",
  orders: "editor",
  members: "manager",
  analytics: "manager",
  advertising: "manager",
  emergency_alerts: "manager",
};

export function canUseCapability(
  capabilities: readonly EntityCapability[],
  role: MembershipRole | null | undefined,
  capability: EntityCapability,
  entityActive = true,
): boolean {
  return (
    entityActive &&
    capabilities.includes(capability) &&
    hasMembershipRole(role, CAPABILITY_MIN_ROLE[capability])
  );
}
