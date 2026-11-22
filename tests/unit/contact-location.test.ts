import { describe, expect, it } from "vitest";

import { cleanSocialLinks, directionsUrl, parseCoordinates, whatsappLink } from "@/lib/contact";
import { coordinatesSchema, socialLinksSchema } from "@/lib/contact-schemas";

describe("parseCoordinates", () => {
  it("reads a Google Maps @lat,lng link", () => {
    expect(parseCoordinates("https://www.google.com/maps/place/X/@5.60372,-0.18696,17z")).toEqual({ lat: 5.60372, lng: -0.18696 });
  });
  it("reads ?q= links and plain text", () => {
    expect(parseCoordinates("https://maps.google.com/?q=6.6885,-1.6244")).toEqual({ lat: 6.6885, lng: -1.6244 });
    expect(parseCoordinates(" 9.4034, -0.8424 ")).toEqual({ lat: 9.4034, lng: -0.8424 });
  });
  it("rejects garbage and out-of-range values", () => {
    expect(parseCoordinates("Madina market")).toBeNull();
    expect(parseCoordinates("95.1, 10.2")).toBeNull();
  });
});

describe("directionsUrl", () => {
  it("routes to the exact pin when known", () => {
    expect(directionsUrl({ lat: 5.6, lng: -0.18, query: "x" })).toBe("https://www.google.com/maps/dir/?api=1&destination=5.6,-0.18");
  });
  it("falls back to a place search", () => {
    expect(directionsUrl({ lat: null, lng: null, query: "Madina, Accra" })).toContain("search/?api=1&query=Madina%2C%20Accra");
  });
});

describe("social links", () => {
  it("keeps only known https networks", () => {
    expect(cleanSocialLinks({ facebook: "https://facebook.com/a", instagram: "http://x", myspace: "https://m" })).toEqual({ facebook: "https://facebook.com/a" });
    expect(cleanSocialLinks(null)).toEqual({});
  });
  it("schema rejects http and unknown keys", () => {
    expect(socialLinksSchema.safeParse({ facebook: "http://facebook.com/a" }).success).toBe(false);
    expect(socialLinksSchema.safeParse({ myspace: "https://m.com" }).success).toBe(false);
    expect(socialLinksSchema.safeParse({ tiktok: "https://tiktok.com/@a" }).success).toBe(true);
  });
  it("coordinates schema validates ranges", () => {
    expect(coordinatesSchema.safeParse(null).success).toBe(true);
    expect(coordinatesSchema.safeParse({ lat: 5.6, lng: -0.2 }).success).toBe(true);
    expect(coordinatesSchema.safeParse({ lat: 200, lng: 0 }).success).toBe(false);
  });
});

describe("whatsappLink", () => {
  it("is null when no WhatsApp number is set (no fallback to phone)", () => {
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink("024 123 4567")).toBe("https://wa.me/233241234567");
  });
});
