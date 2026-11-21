/**
 * The engagement features attacked through the public Supabase API, the way a
 * malicious client would call them (no Next.js in between).
 */
import { beforeAll, describe, expect, it } from "vitest";

import { anonClient, IDS, signedIn, USERS } from "./helpers";

type Client = Awaited<ReturnType<typeof signedIn>>;
let resident: Client, capeCoast: Client, business: Client, ngo: Client;
const HEALTH_CENTRE = "e0000000-0000-4000-8000-000000000003";

beforeAll(async () => {
  [resident, capeCoast, business, ngo] = await Promise.all([
    signedIn(USERS.resident),
    signedIn(USERS.capeCoast),
    signedIn(USERS.business),
    signedIn(USERS.ngo),
  ]);
});

describe("anonymous visitors", () => {
  it("cannot read private engagement tables", async () => {
    const anon = anonClient();
    for (const table of ["conversations", "conversation_messages", "service_bookings", "support_tickets", "entity_follows"] as const) {
      const { error } = await anon.from(table).select("*").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });
  it("cannot call engagement RPCs", async () => {
    const anon = anonClient();
    expect((await anon.rpc("start_conversation", { p_entity: IDS.freshFarms, p_subject: "", p_body: "hi" })).error).not.toBeNull();
    expect((await anon.rpc("delete_my_account", { p_confirm: "DELETE" })).error).not.toBeNull();
  });
  it("can read published reviews", async () => {
    const { error } = await anonClient().from("entity_reviews").select("id, rating").limit(5);
    expect(error).toBeNull();
  });
});

describe("reviews", () => {
  it("owners cannot review their own business", async () => {
    const { error } = await business.from("entity_reviews").insert({ entity_id: IDS.freshFarms, rating: 5, body: "We are the best farm!" });
    expect(error?.code).toBe("42501");
  });
  it("authors cannot write the entity's reply or status", async () => {
    const { error } = await capeCoast.from("entity_reviews").update({ response: "fake", status: "published" }).eq("entity_id", HEALTH_CENTRE);
    expect(error?.code).toBe("42501");
  });
  it("another entity cannot reply to reviews it doesn't own", async () => {
    const { data } = await anonClient().from("entity_reviews").select("id").eq("entity_id", HEALTH_CENTRE).limit(1).single();
    const { error } = await business.rpc("respond_to_review", { p_review: data!.id, p_response: "Hijacked" });
    expect(error?.code).toBe("42501");
  });
});

describe("inbox", () => {
  let conversationId: string;
  it("residents can message a business", async () => {
    const { data, error } = await resident.rpc("start_conversation", {
      p_entity: IDS.freshFarms, p_subject: "Integration test", p_body: `Hello ${Date.now()}`,
    });
    expect(error).toBeNull();
    conversationId = data!;
  });
  it("messages cannot be inserted directly (no impersonating the business)", async () => {
    const { error } = await resident.from("conversation_messages").insert({ conversation_id: conversationId, sender_side: "entity", body: "Free money!" });
    expect(error?.code).toBe("42501");
  });
  it("outsiders can neither read nor post", async () => {
    expect((await capeCoast.from("conversation_messages").select("id").eq("conversation_id", conversationId)).data).toEqual([]);
    expect((await capeCoast.rpc("send_message", { p_conversation: conversationId, p_body: "hi" })).error?.code).toBe("42501");
    expect((await ngo.from("conversations").select("id").eq("id", conversationId)).data).toEqual([]);
  });
  it("the business sees and answers it", async () => {
    expect((await business.from("conversations").select("id").eq("id", conversationId)).data?.length).toBe(1);
    expect((await business.rpc("send_message", { p_conversation: conversationId, p_body: "Yes we deliver" })).error).toBeNull();
  });
  it("residents cannot block the business side", async () => {
    expect((await resident.rpc("set_conversation_status", { p_conversation: conversationId, p_status: "blocked" })).error?.code).toBe("42501");
  });
});

describe("bookings", () => {
  it("bookings cannot be inserted or edited directly", async () => {
    const { error } = await resident.from("service_bookings").insert({
      service_id: IDS.freshFarms, entity_id: HEALTH_CENTRE, customer_id: IDS.resident, requested_date: "2099-01-01", status: "confirmed",
    } as never);
    expect(error?.code).toBe("42501");
  });
  it("customers cannot confirm their own booking and outsiders cannot see it", async () => {
    const { data: service } = await anonClient().from("services").select("id").eq("entity_id", HEALTH_CENTRE).limit(1).single();
    const date = new Date(Date.now() + 20 * 86_400_000 + Math.floor(Math.random() * 200) * 86_400_000).toISOString().slice(0, 10);
    const { data: id, error } = await resident.rpc("request_booking", { p_service: service!.id, p_date: date });
    expect(error).toBeNull();
    expect((await resident.rpc("update_booking_status", { p_booking: id!, p_status: "confirmed" })).error?.code).toBe("22023");
    expect((await capeCoast.from("service_bookings").select("id").eq("id", id!)).data).toEqual([]);
    expect((await business.from("service_bookings").select("id").eq("id", id!)).data).toEqual([]);
    expect((await business.rpc("update_booking_status", { p_booking: id!, p_status: "declined" })).error?.code).toBe("42501");
    expect((await ngo.rpc("update_booking_status", { p_booking: id!, p_status: "confirmed" })).error).toBeNull();
  });
});

describe("support desk", () => {
  it("tickets are private to the requester", async () => {
    const { data: id, error } = await resident.rpc("create_support_ticket", {
      p_category: "bug", p_subject: "Integration test ticket", p_body: "Testing the private support desk.",
    });
    expect(error).toBeNull();
    expect((await capeCoast.from("support_tickets").select("id").eq("id", id!)).data).toEqual([]);
    expect((await capeCoast.rpc("reply_support_ticket", { p_ticket: id!, p_body: "hi" })).error).not.toBeNull();
    expect((await resident.rpc("update_support_ticket", { p_ticket: id!, p_priority: "urgent" })).error?.code).toBe("42501");
  });
});

describe("follows and polls", () => {
  it("cannot follow or vote as someone else", async () => {
    expect((await resident.from("entity_follows").insert({ entity_id: IDS.freshFarms, user_id: IDS.capeCoast } as never)).error?.code).toBe("42501");
    const { data: opt } = await anonClient().from("poll_options").select("id, post_id").limit(1).single();
    expect((await resident.from("poll_votes").insert({ post_id: opt!.post_id, option_id: opt!.id, user_id: IDS.capeCoast } as never)).error?.code).toBe("42501");
  });
});
