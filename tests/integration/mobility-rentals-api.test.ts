/**
 * Rentals, riders, trips and the owner fast-track attacked through the public Supabase API.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { anonClient, IDS, signedIn, USERS } from "./helpers";

type Client = Awaited<ReturnType<typeof signedIn>>;
let resident: Client, capeCoast: Client, business: Client, ngo: Client, districtAdmin: Client;

beforeAll(async () => {
  [resident, capeCoast, business, ngo, districtAdmin] = await Promise.all([
    signedIn(USERS.resident),
    signedIn(USERS.capeCoast),
    signedIn(USERS.business),
    signedIn(USERS.ngo),
    signedIn(USERS.districtAdmin),
  ]);
});

describe("anonymous visitors", () => {
  it("can browse rentals but not trips, riders or enquiries", async () => {
    const anon = anonClient();
    expect((await anon.from("rental_listings").select("id").limit(1)).error).toBeNull();
    for (const table of ["trips", "rider_profiles", "rental_inquiries"] as const) {
      expect((await anon.from(table).select("*").limit(1)).error?.code, table).toBe("42501");
    }
    expect((await anon.rpc("request_trip", {
      p_kind: "ride", p_community: IDS.kwamankese, p_pickup_address: "A", p_dropoff_address: "B", p_customer_phone: "+233240000000", p_offered_fare: 5,
    })).error).not.toBeNull();
  });
});

describe("owner fast-track", () => {
  it("non-owners cannot approve their own application", async () => {
    const { data: app } = await districtAdmin.from("entity_applications").insert({
      entity_type: "business", proposed_name: `Admin Shop ${Date.now()}`, sector: "commerce", community_id: IDS.kwamankese,
      description: "A district admin trying to approve their own shop.", contact_phone: "+233 24 111 0002",
    }).select("id").single();
    const { error } = await districtAdmin.rpc("fast_track_entity_application", { p_application: app!.id });
    expect(error?.code).toBe("42501");
    await districtAdmin.rpc("withdraw_entity_application", { p_application: app!.id });
  });
});

describe("rentals", () => {
  it("cannot list on someone else's behalf or remove-hide your own listing", async () => {
    const forged = await resident.from("rental_listings").insert({
      owner_id: IDS.capeCoast, community_id: IDS.kwamankese, rental_type: "room", title: "Forged listing",
      description: "Listing a property on behalf of another user.", price: 100, contact_phone: "+233240000000",
    } as never);
    expect(forged.error?.code).toBe("42501");
    const { data: mine } = await resident.from("rental_listings").insert({
      community_id: IDS.kwamankese, rental_type: "room", title: `Room ${Date.now()}`,
      description: "A clean single room close to the market and lorry station.", price: 200, contact_phone: "+233240000007",
    }).select("id").single();
    expect((await resident.from("rental_listings").update({ status: "removed" }).eq("id", mine!.id)).error?.code).toBe("42501");
    expect((await capeCoast.from("rental_listings").update({ price: 1 }).eq("id", mine!.id).select("id")).data).toEqual([]);
    await resident.from("rental_listings").delete().eq("id", mine!.id);
  });
  it("enquiries are private to the sender and the landlord", async () => {
    const { data: listing } = await anonClient().from("rental_listings").select("id, owner_id").eq("status", "available").neq("owner_id", IDS.capeCoast).limit(1).single();
    const { error } = await capeCoast.from("rental_inquiries").insert({ rental_id: listing!.id, message: `Viewing please ${Date.now()}`, contact_phone: "+233240000008" });
    expect(error === null || error.code === "54000").toBe(true);
    expect((await resident.from("rental_inquiries").select("id").eq("rental_id", listing!.id)).data).toEqual([]);
  });
});

describe("riders and trips", () => {
  it("riders cannot approve themselves or read coordinates", async () => {
    await capeCoast.from("rider_profiles").upsert({
      user_id: IDS.capeCoast, vehicle_type: "motorbike", vehicle_description: "Blue motorbike", community_id: "30000000-0000-4000-8000-000000000004", phone: "+233240000008",
    } as never, { onConflict: "user_id", ignoreDuplicates: true });
    expect((await capeCoast.from("rider_profiles").update({ status: "approved" } as never).eq("user_id", IDS.capeCoast)).error?.code).toBe("42501");
    expect((await capeCoast.rpc("set_rider_online", { p_online: true })).error?.code).toBe("42501");
    expect((await business.from("rider_profiles").select("last_lat")).error?.code).toBe("42501");
    expect((await capeCoast.rpc("admin_review_rider", { p_rider: IDS.capeCoast, p_status: "approved" })).error?.code).toBe("42501");
  });
  it("trips cannot be forged, and outsiders can't see or change them", async () => {
    expect((await resident.from("trips").insert({
      kind: "ride", customer_id: IDS.resident, community_id: IDS.kwamankese, pickup_address: "A", dropoff_address: "B", customer_phone: "+233240000000", offered_fare: 5, status: "completed",
    } as never)).error?.code).toBe("42501");
    const { data: tripId, error } = await business.rpc("request_trip", {
      p_kind: "delivery", p_community: IDS.kwamankese, p_pickup_address: "Fresh Farms", p_dropoff_address: "Asebu",
      p_customer_phone: "+233 24 000 0005", p_offered_fare: 12, p_package_description: "Bag of cassava",
    });
    expect(error === null || error.code === "54000").toBe(true);
    if (!tripId) return;
    expect((await capeCoast.from("trips").select("id").eq("id", tripId)).data).toEqual([]);
    expect((await capeCoast.rpc("update_trip_status", { p_trip: tripId, p_status: "cancelled" })).error?.code).toBe("42501");
    expect((await ngo.rpc("accept_trip", { p_trip: tripId })).error).not.toBeNull(); // not an approved rider
    expect((await business.rpc("update_trip_status", { p_trip: tripId, p_status: "cancelled" })).error).toBeNull();
  });
});
