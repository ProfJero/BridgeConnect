import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("cloudinary signature", () => {
  it("matches Cloudinary's documented example", async () => {
    const { cloudinarySignature } = await import("@/lib/cloudinary.server");
    // https://cloudinary.com/documentation/authentication_signatures (example values)
    const signature = await cloudinarySignature(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd",
    );
    expect(signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("signs an upload pinned to one public_id without overwrite", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_KEY", "123");
    vi.stubEnv("CLOUDINARY_API_SECRET", "secret");
    const { signImageUpload } = await import("@/lib/cloudinary.server");
    const signed = await signImageUpload("users/a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001.jpg");
    expect(signed?.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(signed?.fields).toMatchObject({
      public_id: "bridgeconnect/users/a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000001",
      overwrite: "false",
      allowed_formats: "jpg,png,webp",
      api_key: "123",
    });
    expect(signed?.fields).not.toHaveProperty("api_secret");
    expect(JSON.stringify(signed)).not.toContain("secret");
  });

  it("returns null when credentials are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    const { signImageUpload } = await import("@/lib/cloudinary.server");
    expect(await signImageUpload("users/x/y.jpg")).toBeNull();
  });
});

describe("public image URLs", () => {
  it("serves optimised Cloudinary URLs when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "demo");
    const { publicMediaUrl } = await import("@/lib/storage");
    expect(publicMediaUrl("entities/e1/p1.png", 640)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/bridgeconnect/entities/e1/p1",
    );
  });

  it("falls back to Supabase Storage otherwise", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "");
    const { publicMediaUrl } = await import("@/lib/storage");
    expect(publicMediaUrl("users/u1/p1.jpg")).toMatch(/\/storage\/v1\/object\/public\/public-media\/users\/u1\/p1\.jpg$/);
    expect(publicMediaUrl(null)).toBeNull();
  });
});
