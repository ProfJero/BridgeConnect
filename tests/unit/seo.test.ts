import { describe, expect, it } from "vitest";

import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contact";
import { absoluteUrl, excerpt } from "@/lib/seo";
import { entitySchema, eventSchema, jobPostingSchema, productSchema } from "@/lib/structured-data";

const place = { name: "Kwamankese", districts: { name: "AAK", regions: { name: "Central Region" } } };

describe("contact links", () => {
  it("converts Ghanaian local numbers to international form", () => {
    expect(toInternationalDigits("024 123 4567")).toBe("233241234567");
    expect(toInternationalDigits("+233 24 123 4567")).toBe("233241234567");
    expect(toInternationalDigits("00233241234567")).toBe("233241234567");
    expect(toInternationalDigits("12")).toBeNull();
    expect(toInternationalDigits(null)).toBeNull();
  });

  it("builds WhatsApp and tel links", () => {
    expect(whatsappLink("0241234567", "Hi & bye")).toBe("https://wa.me/233241234567?text=Hi%20%26%20bye");
    expect(whatsappLink("")).toBeNull();
    expect(telLink("024 123-4567")).toBe("tel:0241234567");
    expect(telLink("+233 24")).toBe("tel:+23324");
  });
});

describe("seo helpers", () => {
  it("builds absolute URLs on the site origin", () => {
    expect(absoluteUrl("/jobs/x")).toMatch(/^https?:\/\/[^/]+\/jobs\/x$/);
  });

  it("collapses whitespace and truncates on a word boundary", () => {
    expect(excerpt("  a\n\n b  ")).toBe("a b");
    const out = excerpt("word ".repeat(100), 50)!;
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
    expect(excerpt(null)).toBeUndefined();
  });
});

describe("structured data", () => {
  it("maps a job to a Google JobPosting", () => {
    const data = jobPostingSchema({
      slug: "farm-hand",
      title: "Farm hand",
      description: "Help on the farm",
      requirements: null,
      published_at: "2026-10-01T00:00:00Z",
      created_at: "2026-09-30T00:00:00Z",
      application_deadline: "2026-11-01",
      employment_type: "full_time",
      salary_min: 800,
      salary_max: 1200,
      salary_period: "month",
      currency: "GHS",
      location_note: null,
      communities: place,
      entities: { name: "Kwamankese Farms", slug: "kwamankese-farms" },
    });
    expect(data).toMatchObject({
      "@type": "JobPosting",
      employmentType: "FULL_TIME",
      validThrough: "2026-11-01T23:59:59Z",
      jobLocation: { address: { addressLocality: "Kwamankese", addressRegion: "Central Region", addressCountry: "GH" } },
      baseSalary: { currency: "GHS", value: { minValue: 800, maxValue: 1200, unitText: "MONTH" } },
    });
  });

  it("omits baseSalary for fixed-fee jobs", () => {
    const data = jobPostingSchema({
      slug: "s", title: "t", description: "d", requirements: null, published_at: null, created_at: "2026-01-01",
      application_deadline: null, employment_type: "contract", salary_min: 100, salary_max: null,
      salary_period: "fixed", currency: "GHS", location_note: null, communities: null,
      entities: { name: "E", slug: "e" },
    });
    expect(data).not.toHaveProperty("baseSalary");
    expect(data).not.toHaveProperty("validThrough");
  });

  it("marks cancelled and online events", () => {
    const data = eventSchema({
      slug: "e", title: "Webinar", description: "d", starts_at: "2026-11-01T10:00:00Z", ends_at: null,
      status: "cancelled", is_online: true, venue: null, communities: place, entities: { name: "E", slug: "e" },
    });
    expect(data.eventStatus).toBe("https://schema.org/EventCancelled");
    expect(data.location).toMatchObject({ "@type": "VirtualLocation" });
  });

  it("maps product availability and price", () => {
    const data = productSchema({
      slug: "p", name: "Gari", description: null, price: 25, currency: "GHS", status: "out_of_stock",
      images: [], seller: { name: "S", slug: "s" },
    });
    expect(data.offers).toMatchObject({ price: "25.00", availability: "https://schema.org/OutOfStock" });
    expect(data).not.toHaveProperty("image");
  });

  it("uses the schema.org type for the entity and opening hours", () => {
    const data = entitySchema({
      slug: "clinic", name: "Clinic", entity_type: "health_facility", tagline: null, description: null,
      phone: "024", email: null, website: null, address: null, communities: place,
      opening_hours: { mon: { open: "08:00", close: "17:00" }, sun: null },
    });
    expect(data["@type"]).toBe("MedicalOrganization");
    expect(data.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "08:00", closes: "17:00" },
    ]);
  });
});
