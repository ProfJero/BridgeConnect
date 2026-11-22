import { describe, expect, it } from "vitest";

import { riderProfileSchema, tripRequestSchema } from "@/features/mobility/schemas";
import { checkoutSchema } from "@/features/orders/schemas";
import { inquirySchema, rentalSchema } from "@/features/rentals/schemas";
import { haversineKm, suggestFare } from "@/lib/fares";
import { openState } from "@/lib/opening-hours";

const uuid = "8f14e45f-ceea-467a-9f3c-5b4c7d1f2a01";

describe("fares", () => {
  it("computes great-circle distance", () => {
    // Cape Coast → Kwamankese is roughly 14 km in a straight line.
    const km = haversineKm({ lat: 5.106, lng: -1.247 }, { lat: 5.226, lng: -1.198 });
    expect(km).toBeGreaterThan(12);
    expect(km).toBeLessThan(16);
  });
  it("never suggests below the vehicle minimum and grows with distance", () => {
    expect(suggestFare("motorbike")).toBe(8);
    expect(suggestFare("car", 0.1)).toBe(15);
    expect(suggestFare("car", 10)).toBeGreaterThan(suggestFare("car", 2));
  });
});

describe("opening hours (Ghana time = UTC)", () => {
  const hours = { mon: { open: "08:00", close: "17:00" }, sat: { open: "18:00", close: "02:00" } };
  it("is open within hours", () => {
    expect(openState(hours, new Date("2026-11-23T10:00:00Z"))).toBe("open"); // Monday
  });
  it("is closed outside hours and on days without hours", () => {
    expect(openState(hours, new Date("2026-11-23T18:30:00Z"))).toBe("closed");
    expect(openState(hours, new Date("2026-11-24T10:00:00Z"))).toBe("closed"); // Tuesday
  });
  it("handles overnight hours", () => {
    expect(openState(hours, new Date("2026-11-28T23:00:00Z"))).toBe("open"); // Saturday night
  });
  it("returns null when no hours are published", () => {
    expect(openState(null)).toBeNull();
  });
});

describe("trip requests", () => {
  const base = {
    kind: "ride", communityId: uuid, pickupAddress: "Market", dropoffAddress: "Clinic",
    customerPhone: "+233 24 000 0000", paymentMethod: "cash", offeredFare: "12",
  };
  it("accepts a ride and coerces the fare", () => {
    const r = tripRequestSchema.safeParse(base);
    expect(r.success && r.data.offeredFare).toBe(12);
  });
  it("requires a package description for deliveries", () => {
    expect(tripRequestSchema.safeParse({ ...base, kind: "delivery" }).success).toBe(false);
    expect(tripRequestSchema.safeParse({ ...base, kind: "delivery", packageDescription: "Bag of rice" }).success).toBe(true);
  });
  it.each([0, -5, 20000])("rejects fare %s", (offeredFare) => {
    expect(tripRequestSchema.safeParse({ ...base, offeredFare }).success).toBe(false);
  });
  it("rejects out-of-range coordinates and unknown vehicles", () => {
    expect(tripRequestSchema.safeParse({ ...base, pickupLat: 120 }).success).toBe(false);
    expect(tripRequestSchema.safeParse({ ...base, vehicleType: "helicopter" }).success).toBe(false);
  });
  it("never accepts a rider id or status from the client body", () => {
    const r = tripRequestSchema.safeParse({ ...base, rider_id: uuid, status: "completed" });
    expect(r.success && ("rider_id" in r.data || "status" in r.data)).toBe(false);
  });
});

describe("rider profiles", () => {
  const base = { vehicleType: "tricycle", vehicleDescription: "Yellow tricycle", offersRides: true, offersDelivery: false, communityId: uuid, phone: "+233240000000" };
  it("accepts a valid profile", () => expect(riderProfileSchema.safeParse(base).success).toBe(true));
  it("must offer at least one service", () => {
    expect(riderProfileSchema.safeParse({ ...base, offersRides: false }).success).toBe(false);
  });
  it("strips status so riders can't approve themselves", () => {
    const r = riderProfileSchema.safeParse({ ...base, status: "approved" });
    expect(r.success && "status" in r.data).toBe(false);
  });
});

describe("rentals", () => {
  const base = {
    communityId: uuid, rentalType: "self_contain", title: "Self-contain near market",
    description: "Tiled self-contain with water and prepaid meter.", price: "450", period: "month",
    contactPhone: "+233 24 000 0000", status: "available",
  };
  it("accepts a valid listing", () => expect(rentalSchema.safeParse(base).success).toBe(true));
  it("rejects the moderator-only status and bad prices", () => {
    expect(rentalSchema.safeParse({ ...base, status: "removed" }).success).toBe(false);
    expect(rentalSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
  });
  it("caps photos and amenities", () => {
    expect(rentalSchema.safeParse({ ...base, mediaIds: Array(9).fill(uuid) }).success).toBe(false);
    expect(rentalSchema.safeParse({ ...base, amenities: Array(21).fill("Water") }).success).toBe(false);
  });
  it("validates viewing requests", () => {
    expect(inquirySchema.safeParse({ rentalId: uuid, message: "Can I view it?", contactPhone: "+233240000000" }).success).toBe(true);
    expect(inquirySchema.safeParse({ rentalId: uuid, message: "hi", contactPhone: "123" }).success).toBe(false);
  });
});

describe("cart checkout", () => {
  const base = { entityId: uuid, items: [{ productId: uuid, quantity: "2" }], fulfilment: "pickup", contactPhone: "+233240000000" };
  it("accepts a cart and never takes a client price", () => {
    const r = checkoutSchema.safeParse({ ...base, items: [{ productId: uuid, quantity: 2, price: 0.01 }] });
    expect(r.success).toBe(true);
    expect(r.success && "price" in r.data.items[0]!).toBe(false);
  });
  it("rejects empty carts, duplicates and missing delivery address", () => {
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, items: [{ productId: uuid, quantity: 1 }, { productId: uuid, quantity: 1 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfilment: "delivery" }).success).toBe(false);
  });
});
