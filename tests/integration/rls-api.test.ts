/**
 * End-to-end authorization through the public Supabase API (the same path a
 * malicious client would use, bypassing the Next.js UI entirely).
 */
import { beforeAll, describe, expect, it } from "vitest";

import { anonClient, IDS, pdf, png, signedIn, USERS } from "./helpers";

type Client = Awaited<ReturnType<typeof signedIn>>;
let resident: Client, capeCoast: Client, business: Client, ngo: Client, verifier: Client;

beforeAll(async () => {
  [resident, capeCoast, business, ngo, verifier] = await Promise.all([
    signedIn(USERS.resident),
    signedIn(USERS.capeCoast),
    signedIn(USERS.business),
    signedIn(USERS.ngo),
    signedIn(USERS.verifier),
  ]);
});

describe("anonymous access", () => {
  it("cannot read private tables", async () => {
    const anon = anonClient();
    for (const table of ["entity_applications", "orders", "notifications", "audit_logs", "reports"] as const) {
      const { error } = await anon.from(table).select("id").limit(1);
      expect(error?.code, table).toBe("42501");
    }
  });
  it("cannot call privileged RPCs", async () => {
    const { error } = await anonClient().rpc("admin_list_users", {});
    expect(error).not.toBeNull();
  });
});

describe("role escalation and manipulated requests", () => {
  it("a resident cannot grant themselves a role", async () => {
    const { error } = await resident.rpc("admin_assign_role", { p_user: IDS.resident, p_role_key: "platform_owner" });
    expect(error?.code).toBe("42501");
  });
  it("a resident cannot unsuspend or flag themselves", async () => {
    const { error } = await resident.from("profiles").update({ account_status: "active", is_demo: false }).eq("id", IDS.resident);
    expect(error?.code).toBe("42501");
  });
  it("cannot write audit logs or notifications directly", async () => {
    expect((await resident.from("audit_logs").insert({ action: "fake.entry" })).error?.code).toBe("42501");
    expect((await resident.from("notifications").insert({ recipient_id: IDS.capeCoast, type: "system.fake", title: "Phish" })).error?.code).toBe("42501");
  });
  it("rejects invalid ids", async () => {
    const { error } = await resident.rpc("withdraw_entity_application", { p_application: "not-a-uuid" });
    expect(error?.code).toBe("22P02");
  });
  it("prices orders from the database, ignoring client prices", async () => {
    const { data: product } = await resident.from("products").select("id, price").eq("entity_id", IDS.freshFarms).eq("status", "active").limit(1).single();
    const { data: orderId, error } = await resident.rpc("place_order", {
      p_entity: IDS.freshFarms,
      p_items: [{ product_id: product!.id, quantity: 1, unit_price: 0.01, price: 0 }],
      p_fulfilment: "pickup",
      p_contact_phone: "+233 24 000 0007",
    });
    expect(error).toBeNull();
    const { data: order } = await resident.from("orders").select("subtotal").eq("id", orderId!).single();
    expect(Number(order!.subtotal)).toBe(Number(product!.price));
    await resident.rpc("update_order_status", { p_order: orderId!, p_status: "cancelled" });
  });
  it("cannot order another seller's product through this seller", async () => {
    const { error } = await resident.rpc("place_order", {
      p_entity: IDS.youthFoundation,
      p_items: [{ product_id: IDS.freshFarms, quantity: 1 }],
      p_fulfilment: "pickup",
      p_contact_phone: "+233 24 000 0007",
    });
    expect(error).not.toBeNull();
  });
});

describe("cross-user and cross-entity isolation", () => {
  it("users cannot see each other's orders or notifications", async () => {
    const { data: orders } = await capeCoast.from("orders").select("id").eq("buyer_id", IDS.resident);
    expect(orders).toEqual([]);
    const { data: notes } = await capeCoast.from("notifications").select("id").eq("recipient_id", IDS.resident);
    expect(notes).toEqual([]);
  });
  it("an entity owner cannot edit another entity", async () => {
    const { data, error } = await business.from("entities").update({ tagline: "hijacked" }).eq("id", IDS.youthFoundation).select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]); // RLS: zero rows matched
  });
  it("an entity owner cannot list products for another entity", async () => {
    const { error } = await business.from("products").insert({ entity_id: IDS.youthFoundation, name: "Nope", price: 1 });
    expect(error?.code).toBe("42501");
  });
});

describe("storage access control", () => {
  it("users can only upload into their own media folder", async () => {
    const own = await resident.storage.from("public-media").upload(`users/${IDS.resident}/${crypto.randomUUID()}.png`, png());
    expect(own.error).toBeNull();
    const other = await resident.storage.from("public-media").upload(`users/${IDS.capeCoast}/${crypto.randomUUID()}.png`, png());
    expect(other.error).not.toBeNull();
    const entity = await resident.storage.from("public-media").upload(`entities/${IDS.freshFarms}/${crypto.randomUUID()}.png`, png());
    expect(entity.error).not.toBeNull();
  });

  it("buckets reject disallowed file types", async () => {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: "image/svg+xml" });
    const { error } = await resident.storage.from("public-media").upload(`users/${IDS.resident}/${crypto.randomUUID()}.svg`, svg);
    expect(error).not.toBeNull();
  });

  it("verification documents are private to the applicant and in-scope reviewers", async () => {
    const { data: app } = await resident.from("entity_applications").select("id, status").eq("applicant_id", IDS.resident).in("status", ["submitted", "info_requested"]).limit(1).maybeSingle();
    if (!app) return; // seed application already processed in this database
    const path = `${IDS.resident}/${app.id}/${crypto.randomUUID()}.pdf`;
    expect((await resident.storage.from("verification-documents").upload(path, pdf())).error).toBeNull();

    // Another resident cannot read it or upload into the applicant's folder.
    expect((await capeCoast.storage.from("verification-documents").createSignedUrl(path, 60)).error).not.toBeNull();
    expect((await capeCoast.storage.from("verification-documents").upload(`${IDS.resident}/${app.id}/${crypto.randomUUID()}.pdf`, pdf())).error).not.toBeNull();
    // The district verification officer can.
    expect((await verifier.storage.from("verification-documents").createSignedUrl(path, 60)).error).toBeNull();
    await resident.storage.from("verification-documents").remove([path]);
  });

  it("CVs are visible to the hiring entity only", async () => {
    const { data: job } = await resident.from("jobs").select("id").eq("entity_id", IDS.youthFoundation).eq("status", "open").limit(1).single();
    const path = `${IDS.capeCoast}/${job!.id}/${crypto.randomUUID()}.pdf`;
    expect((await capeCoast.storage.from("job-applications").upload(path, pdf())).error).toBeNull();
    const { error: applyError } = await capeCoast.from("job_applications").insert({
      job_id: job!.id,
      cover_letter: "I would love to teach digital skills to young people in Kwamankese.",
      contact_phone: "+233 24 000 0008",
      cv_path: path,
    });
    expect(applyError === null || applyError.code === "23505").toBe(true);

    // Hiring NGO owner can open the CV; an unrelated business owner cannot.
    expect((await ngo.storage.from("job-applications").createSignedUrl(path, 60)).error).toBeNull();
    expect((await business.storage.from("job-applications").createSignedUrl(path, 60)).error).not.toBeNull();
  });
});
