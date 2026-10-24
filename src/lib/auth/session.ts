import "server-only";

import { forbidden, notFound, redirect } from "next/navigation";
import { cache } from "react";

import {
  can,
  canAnywhere,
  canUseCapability,
  hasMembershipRole,
  isPermission,
  type EntityCapability,
  type LocationTarget,
  type MembershipRole,
  type Permission,
  type PermissionGrant,
} from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type ViewerProfile = Pick<
  Tables["profiles"]["Row"],
  | "id"
  | "display_name"
  | "username"
  | "avatar_path"
  | "bio"
  | "home_community_id"
  | "account_status"
  | "is_demo"
>;

export type ViewerWorkspace = {
  entityId: string;
  name: string;
  slug: string;
  entityType: Enums["entity_type"];
  status: Enums["entity_status"];
  logoPath: string | null;
  role: MembershipRole;
};

export type Viewer = {
  id: string;
  email: string | null;
  profile: ViewerProfile;
  grants: PermissionGrant[];
  workspaces: ViewerWorkspace[];
  isActive: boolean;
  isAdmin: boolean;
};

/**
 * Resolve the current viewer once per request (React cache). Uses
 * `auth.getUser()`, which validates the session with Supabase Auth rather than
 * trusting the cookie payload.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, accessResult, workspacesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, username, avatar_path, bio, home_community_id, account_status, is_demo",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("my_access"),
    supabase.rpc("my_workspaces"),
  ]);

  const profile = profileResult.data;
  if (!profile) return null;

  const grants: PermissionGrant[] = (accessResult.data ?? []).flatMap((row) =>
    isPermission(row.permission_key)
      ? [
          {
            permission: row.permission_key,
            scope: row.scope,
            regionId: row.region_id,
            districtId: row.district_id,
            communityId: row.community_id,
          },
        ]
      : [],
  );

  const workspaces: ViewerWorkspace[] = (workspacesResult.data ?? []).map((w) => ({
    entityId: w.entity_id,
    name: w.name,
    slug: w.slug,
    entityType: w.entity_type,
    status: w.status,
    logoPath: w.logo_path,
    role: w.role,
  }));

  return {
    id: user.id,
    email: user.email ?? null,
    profile,
    grants,
    workspaces,
    isActive: profile.account_status === "active",
    isAdmin: canAnywhere(grants, "admin.access"),
  };
});

/** Require a signed-in user; otherwise redirect to sign-in and come back. */
export async function requireViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return viewer;
}

/** Require a signed-in user whose account is active (not suspended). */
export async function requireActiveViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await requireViewer(returnTo);
  if (!viewer.isActive) forbidden();
  return viewer;
}

/**
 * Require an administrator holding `permission` anywhere (row-level scope is
 * enforced by RLS on every query the page then makes).
 */
export async function requireAdminPermission(permission: Permission = "admin.access") {
  const viewer = await requireActiveViewer("/admin");
  if (!viewer.isAdmin || !canAnywhere(viewer.grants, permission)) forbidden();
  return viewer;
}

export function viewerCan(viewer: Viewer | null, permission: Permission, target?: LocationTarget) {
  return Boolean(viewer?.isActive) && can(viewer!.grants, permission, target);
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------
export type WorkspaceContext = {
  viewer: Viewer;
  entity: Pick<
    Tables["entities"]["Row"],
    | "id"
    | "name"
    | "slug"
    | "entity_type"
    | "status"
    | "status_reason"
    | "community_id"
    | "logo_path"
    | "sector"
  >;
  role: MembershipRole;
  capabilities: EntityCapability[];
  can: (capability: EntityCapability) => boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Load a workspace for the current viewer. Non-members get a 404 (we do not
 * reveal that an entity exists). Members lacking a module's capability or role
 * get a 403.
 */
export const getWorkspace = cache(async (entityId: string): Promise<WorkspaceContext> => {
  if (!isUuid(entityId)) notFound();
  const viewer = await requireActiveViewer(`/workspace/${entityId}`);
  const membership = viewer.workspaces.find((w) => w.entityId === entityId);
  if (!membership) notFound();

  const supabase = await createClient();
  const [{ data: entity }, { data: caps }] = await Promise.all([
    supabase
      .from("entities")
      .select("id, name, slug, entity_type, status, status_reason, community_id, logo_path, sector")
      .eq("id", entityId)
      .maybeSingle(),
    supabase.rpc("entity_capabilities", { p_entity: entityId }),
  ]);
  if (!entity) notFound();

  const capabilities = (caps ?? []) as EntityCapability[];
  const active = entity.status === "active";
  return {
    viewer,
    entity,
    role: membership.role,
    capabilities,
    can: (capability) => canUseCapability(capabilities, membership.role, capability, active),
  };
});

export async function requireWorkspaceCapability(
  entityId: string,
  capability: EntityCapability,
): Promise<WorkspaceContext> {
  const ctx = await getWorkspace(entityId);
  if (!ctx.can(capability)) forbidden();
  return ctx;
}

export async function requireWorkspaceRole(
  entityId: string,
  minRole: MembershipRole,
): Promise<WorkspaceContext> {
  const ctx = await getWorkspace(entityId);
  if (!hasMembershipRole(ctx.role, minRole)) forbidden();
  return ctx;
}
