import { describe, expect, it } from "vitest";

import { applicationSchema } from "@/features/applications/schemas";
import { signUpSchema } from "@/features/auth/schemas";
import { createPostSchema } from "@/features/community/schemas";
import { placeOrderSchema } from "@/features/orders/schemas";
import { reportSchema } from "@/features/reports/schemas";
import { adSchema, eventSchema, jobSchema } from "@/features/workspace/schemas";
import { assignRoleSchema, moderateSchema, settingSchema } from "@/features/admin/schemas";

const uuid = "8f14e45f-ceea-467a-9f3c-5b4c7d1f2a01";

describe("auth", () => {
  const base = { displayName: "Ama Owusu", email: "ama@example.com", password: "Str0ngPassword", acceptTerms: true };
  it("accepts a valid sign-up and normalises email", () => {
    const r = signUpSchema.safeParse({ ...base, email: "  AMA@Example.COM " });
    expect(r.success && r.data.email).toBe("ama@example.com");
  });
  it.each(["short1A", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"])("rejects weak password %s", (password) => {
    expect(signUpSchema.safeParse({ ...base, password }).success).toBe(false);
  });
  it("requires accepting the guidelines", () => {
    expect(signUpSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
  });
});

describe("orders never accept a client price", () => {
  it("strips unknown keys such as unit_price", () => {
    const r = placeOrderSchema.safeParse({
      entityId: uuid, productId: uuid, quantity: "2", fulfilment: "pickup", contactPhone: "+233 24 000 0000", unit_price: 0.01,
    });
    expect(r.success).toBe(true);
    expect(r.success && "unit_price" in r.data).toBe(false);
    expect(r.success && r.data.quantity).toBe(2);
  });
  it.each([0, -1, 1001, 1.5])("rejects quantity %s", (quantity) => {
    expect(placeOrderSchema.safeParse({ entityId: uuid, productId: uuid, quantity, fulfilment: "pickup", contactPhone: "+233240000000" }).success).toBe(false);
  });
  it("requires an address for delivery", () => {
    const r = placeOrderSchema.safeParse({ entityId: uuid, productId: uuid, quantity: 1, fulfilment: "delivery", contactPhone: "+233240000000" });
    expect(r.success).toBe(false);
  });
  it("rejects malformed ids (manipulated requests)", () => {
    expect(placeOrderSchema.safeParse({ entityId: "1 OR 1=1", productId: uuid, quantity: 1, fulfilment: "pickup", contactPhone: "+233240000000" }).success).toBe(false);
  });
});

describe("community content", () => {
  it("bounds post length and image count", () => {
    expect(createPostSchema.safeParse({ communityId: uuid, kind: "general", body: "x".repeat(5001) }).success).toBe(false);
    expect(createPostSchema.safeParse({ communityId: uuid, kind: "general", body: "Hi", mediaIds: Array(5).fill(uuid) }).success).toBe(false);
    expect(createPostSchema.safeParse({ communityId: uuid, kind: "general", body: "  " }).success).toBe(false);
  });
  it("keeps script-like text as plain text (React escapes on render)", () => {
    const r = createPostSchema.safeParse({ communityId: uuid, kind: "general", body: "<script>alert(1)</script>" });
    expect(r.success && r.data.body).toBe("<script>alert(1)</script>");
  });
  it("rejects unknown report reasons", () => {
    expect(reportSchema.safeParse({ targetKind: "post", targetId: uuid, reason: "because" }).success).toBe(false);
  });
});

describe("workspace & admin inputs", () => {
  it("validates applications", () => {
    expect(applicationSchema.safeParse({ entityType: "business", proposedName: "A", sector: "commerce", communityId: uuid, description: "short", contactPhone: "123" }).success).toBe(false);
  });
  it("rejects inverted salary ranges", () => {
    const r = jobSchema.safeParse({ entityId: uuid, title: "Teacher", communityId: uuid, description: "x".repeat(30), employmentType: "full_time", salaryMin: 500, salaryMax: 100, status: "open" });
    expect(r.success).toBe(false);
  });
  it("requires https for event links and an end after start", () => {
    const base = { entityId: uuid, title: "Fair", communityId: uuid, description: "A community fair", isOnline: true, startsAt: "2030-01-01T10:00", status: "published" };
    expect(eventSchema.safeParse({ ...base, onlineUrl: "http://insecure.example" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...base, endsAt: "2030-01-01T09:00" }).success).toBe(false);
    expect(eventSchema.safeParse(base).success).toBe(true);
  });
  it("ads may only link inside BridgeConnect", () => {
    const base = { entityId: uuid, title: "Sale!", placement: "home_feed", startsOn: "2030-01-01", endsOn: "2030-01-10", submit: true };
    expect(adSchema.safeParse({ ...base, linkPath: "https://evil.example" }).success).toBe(false);
    expect(adSchema.safeParse({ ...base, linkPath: "/directory/shop" }).success).toBe(true);
  });
  it("role assignment needs a location unless platform-wide", () => {
    expect(assignRoleSchema.safeParse({ userId: uuid, roleKey: "moderator", scope: "district" }).success).toBe(false);
    expect(assignRoleSchema.safeParse({ userId: uuid, roleKey: "moderator", scope: "district", scopeId: uuid }).success).toBe(true);
  });
  it("moderation requires a reason and a known action", () => {
    expect(moderateSchema.safeParse({ targetType: "post", targetId: uuid, action: "hide", reason: "" }).success).toBe(false);
    expect(moderateSchema.safeParse({ targetType: "post", targetId: uuid, action: "delete_everything", reason: "x" }).success).toBe(false);
  });
  it("settings keys are constrained", () => {
    expect(settingSchema.safeParse({ key: "x; drop table", value: "1" }).success).toBe(false);
  });
});
