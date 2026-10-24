import { describe, expect, it } from "vitest";

import {
  broadestScope,
  can,
  canAnywhere,
  canManageMember,
  canUseCapability,
  grantableRoles,
  grantCovers,
  hasMembershipRole,
  type PermissionGrant,
} from "@/lib/auth/permissions";

const AAK = { regionId: "r-central", districtId: "d-aak", communityId: "c-kwamankese" };
const CAPE = { regionId: "r-central", districtId: "d-cape", communityId: "c-cape" };
const OTHER_REGION = { regionId: "r-ashanti", districtId: "d-kumasi", communityId: "c-kumasi" };

const grant = (g: Partial<PermissionGrant> & Pick<PermissionGrant, "permission" | "scope">): PermissionGrant => ({
  regionId: null,
  districtId: null,
  communityId: null,
  ...g,
});

describe("grantCovers (mirrors private.has_permission)", () => {
  it("platform grants cover everything, including no target", () => {
    const g = grant({ permission: "content.moderate", scope: "platform" });
    expect(grantCovers(g)).toBe(true);
    expect(grantCovers(g, OTHER_REGION)).toBe(true);
  });

  it("district grants cover only communities in that district", () => {
    const g = grant({ permission: "content.moderate", scope: "district", districtId: "d-aak" });
    expect(grantCovers(g, AAK)).toBe(true);
    expect(grantCovers(g, CAPE)).toBe(false); // cross-district
    expect(grantCovers(g)).toBe(false); // scoped grants never imply platform-wide power
  });

  it("region grants cover all districts in the region only", () => {
    const g = grant({ permission: "entities.verify", scope: "region", regionId: "r-central" });
    expect(grantCovers(g, AAK)).toBe(true);
    expect(grantCovers(g, CAPE)).toBe(true);
    expect(grantCovers(g, OTHER_REGION)).toBe(false);
  });

  it("community grants cover exactly one community", () => {
    const g = grant({ permission: "content.moderate", scope: "community", communityId: "c-kwamankese" });
    expect(grantCovers(g, AAK)).toBe(true);
    expect(grantCovers(g, { ...AAK, communityId: "c-asebu" })).toBe(false);
  });

  it("does not match on missing target levels", () => {
    const g = grant({ permission: "content.moderate", scope: "district", districtId: "d-aak" });
    expect(grantCovers(g, { communityId: "c-kwamankese" })).toBe(false);
  });
});

describe("can / canAnywhere", () => {
  const grants = [
    grant({ permission: "content.moderate", scope: "district", districtId: "d-aak" }),
    grant({ permission: "admin.access", scope: "district", districtId: "d-aak" }),
  ];
  it("requires the specific permission", () => {
    expect(can(grants, "content.moderate", AAK)).toBe(true);
    expect(can(grants, "entities.verify", AAK)).toBe(false);
  });
  it("canAnywhere ignores scope (navigation only)", () => {
    expect(canAnywhere(grants, "admin.access")).toBe(true);
    expect(canAnywhere(grants, "settings.manage")).toBe(false);
  });
  it("broadestScope picks the widest level", () => {
    expect(broadestScope([...grants, grant({ permission: "content.moderate", scope: "platform" })], "content.moderate")).toBe("platform");
    expect(broadestScope(grants, "audit.read")).toBeNull();
  });
});

describe("workspace roles (mirror entity_add_member / entity_update_member_role)", () => {
  it("ranks roles", () => {
    expect(hasMembershipRole("owner", "manager")).toBe(true);
    expect(hasMembershipRole("editor", "manager")).toBe(false);
    expect(hasMembershipRole(null, "member")).toBe(false);
  });
  it("prevents escalation when granting", () => {
    expect(grantableRoles("owner")).toEqual(["owner", "manager", "editor", "member"]);
    expect(grantableRoles("manager")).toEqual(["editor", "member"]);
    expect(grantableRoles("editor")).toEqual(["member"]);
  });
  it("managers cannot manage peers or owners", () => {
    expect(canManageMember("manager", "editor")).toBe(true);
    expect(canManageMember("manager", "manager")).toBe(false);
    expect(canManageMember("manager", "owner")).toBe(false);
    expect(canManageMember("editor", "member")).toBe(false);
    expect(canManageMember("owner", "owner")).toBe(true);
  });
  it("capability AND role AND active entity are all required", () => {
    expect(canUseCapability(["products"], "editor", "products")).toBe(true);
    expect(canUseCapability(["services"], "owner", "products")).toBe(false); // capability not granted
    expect(canUseCapability(["members"], "editor", "members")).toBe(false); // needs manager
    expect(canUseCapability(["products"], "owner", "products", false)).toBe(false); // suspended entity
  });
});
