import { describe, expect, it } from "vitest";

import { allowedBookingTransitions, bookingRequestSchema } from "@/features/bookings/schemas";
import { createPostSchema, pollOptionsSchema } from "@/features/community/schemas";
import { sendMessageSchema, startConversationSchema } from "@/features/messages/schemas";
import { reviewResponseSchema, reviewSchema } from "@/features/reviews/schemas";
import { ticketSchema, ticketUpdateSchema } from "@/features/support/schemas";
import { CAPABILITY_MIN_ROLE, canUseCapability, isPermission } from "@/lib/auth/permissions";

const uuid = "8f14e45f-ceea-467a-9f3c-5b4c7d1f2a01";
const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

describe("reviews", () => {
  it("accepts a valid review and coerces the rating", () => {
    const r = reviewSchema.safeParse({ entityId: uuid, rating: "4", body: "Friendly staff and fair prices." });
    expect(r.success && r.data.rating).toBe(4);
  });
  it.each([0, 6, 3.5, "x"])("rejects rating %s", (rating) => {
    expect(reviewSchema.safeParse({ entityId: uuid, rating, body: "Friendly staff and fair prices." }).success).toBe(false);
  });
  it("rejects very short or oversized reviews", () => {
    expect(reviewSchema.safeParse({ entityId: uuid, rating: 5, body: "ok" }).success).toBe(false);
    expect(reviewSchema.safeParse({ entityId: uuid, rating: 5, body: "a".repeat(2001) }).success).toBe(false);
  });
  it("strips client-set fields such as status or response", () => {
    const r = reviewSchema.safeParse({ entityId: uuid, rating: 5, body: "Great service here!", status: "published", response: "x" });
    expect(r.success && ("status" in r.data || "response" in r.data)).toBe(false);
  });
  it("allows an empty reply (removes it)", () => {
    expect(reviewResponseSchema.safeParse({ reviewId: uuid, entityId: uuid, response: "" }).success).toBe(true);
  });
});

describe("messages", () => {
  it("requires non-empty, bounded bodies", () => {
    expect(sendMessageSchema.safeParse({ conversationId: uuid, body: "   " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ conversationId: uuid, body: "x".repeat(2001) }).success).toBe(false);
    expect(startConversationSchema.safeParse({ entityId: uuid, body: "Hello" }).success).toBe(true);
  });
  it("never accepts a sender side from the client", () => {
    const r = sendMessageSchema.safeParse({ conversationId: uuid, body: "Hi", sender_side: "entity" });
    expect(r.success && "sender_side" in r.data).toBe(false);
  });
  it("rejects malformed conversation ids", () => {
    expect(sendMessageSchema.safeParse({ conversationId: "1 or 1=1", body: "Hi" }).success).toBe(false);
  });
});

describe("bookings", () => {
  const base = { serviceId: uuid, date: future, contactPhone: "+233 24 000 0000" };
  it("accepts a future booking", () => {
    expect(bookingRequestSchema.safeParse({ ...base, time: "09:30" }).success).toBe(true);
  });
  it("rejects past dates and invalid times", () => {
    expect(bookingRequestSchema.safeParse({ ...base, date: "2020-01-01" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, time: "25:00" }).success).toBe(false);
  });
  it("mirrors the server's transition rules", () => {
    expect(allowedBookingTransitions("entity", "requested")).toEqual(["confirmed", "declined"]);
    expect(allowedBookingTransitions("entity", "confirmed")).toEqual(["completed", "cancelled"]);
    expect(allowedBookingTransitions("customer", "requested")).toEqual(["cancelled"]);
    expect(allowedBookingTransitions("customer", "completed")).toEqual([]);
    expect(allowedBookingTransitions("customer", "requested")).not.toContain("confirmed");
  });
});

describe("polls", () => {
  it("needs 2–6 distinct options", () => {
    expect(pollOptionsSchema.safeParse(["Yes"]).success).toBe(false);
    expect(pollOptionsSchema.safeParse(["Yes", "yes"]).success).toBe(false);
    expect(pollOptionsSchema.safeParse(["A", "B", "C", "D", "E", "F", "G"]).success).toBe(false);
    expect(pollOptionsSchema.safeParse(["Saturday", "Sunday"]).success).toBe(true);
  });
  it("a poll post must carry valid options", () => {
    const post = { communityId: uuid, kind: "poll", body: "Which day?" };
    expect(createPostSchema.safeParse({ ...post, pollOptions: ["Only one", ""] }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...post, pollOptions: ["Sat", "Sun"], pollDays: "7" }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...post, pollOptions: ["Sat", "Sun"], pollDays: 90 }).success).toBe(false);
  });
});

describe("support desk", () => {
  it("validates tickets", () => {
    expect(ticketSchema.safeParse({ category: "bug", subject: "Map broken", body: "The map does not load on my phone." }).success).toBe(true);
    expect(ticketSchema.safeParse({ category: "hack", subject: "x", body: "short" }).success).toBe(false);
  });
  it("rejects unknown priorities and statuses", () => {
    expect(ticketUpdateSchema.safeParse({ ticketId: uuid, priority: "critical" }).success).toBe(false);
    expect(ticketUpdateSchema.safeParse({ ticketId: uuid, status: "deleted" }).success).toBe(false);
  });
});

describe("permission model for new modules", () => {
  it("knows support.manage", () => {
    expect(isPermission("support.manage")).toBe(true);
  });
  it("requires managers to reply to reviews and editors for inbox/bookings", () => {
    expect(CAPABILITY_MIN_ROLE.reviews).toBe("manager");
    expect(CAPABILITY_MIN_ROLE.messages).toBe("editor");
    expect(canUseCapability(["reviews"], "editor", "reviews", true)).toBe(false);
    expect(canUseCapability(["messages"], "editor", "messages", true)).toBe(true);
    expect(canUseCapability(["messages"], "owner", "messages", false)).toBe(false);
  });
});
