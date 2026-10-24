import "server-only";

import { cloudinaryPublicId, CLOUDINARY_FORMATS } from "@/lib/cloudinary";
import { env } from "@/lib/env";

/**
 * Server-side Cloudinary access. The API secret is a Cloudflare Worker secret (CLOUDINARY_API_SECRET), read at
 * request time and never sent to the browser: the browser only receives a short-lived signature for one exact
 * upload (fixed public_id, no overwrite, image formats only).
 */
function credentials() {
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cloudinary request signature: sorted `key=value` pairs joined with `&`, then the secret, SHA-1 hex. */
export async function cloudinarySignature(params: Record<string, string | number>, apiSecret: string): Promise<string> {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sha1Hex(toSign + apiSecret);
}

export type SignedUpload = {
  uploadUrl: string;
  fields: Record<string, string>;
};

export async function signImageUpload(storagePath: string): Promise<SignedUpload | null> {
  const creds = credentials();
  if (!creds) return null;
  const params = {
    allowed_formats: CLOUDINARY_FORMATS.join(","),
    overwrite: "false",
    public_id: cloudinaryPublicId(storagePath),
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = await cloudinarySignature(params, creds.apiSecret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
    fields: { ...params, timestamp: String(params.timestamp), api_key: creds.apiKey, signature },
  };
}

export type CloudinaryResource = { bytes: number; format: string; width: number; height: number };

/** Look up an uploaded image (Admin API) so the server records real size/format, not what the client claims. */
export async function getImageResource(storagePath: string): Promise<CloudinaryResource | null> {
  const creds = credentials();
  if (!creds) return null;
  const id = cloudinaryPublicId(storagePath).split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/image/upload/${id}`, {
    headers: { Authorization: `Basic ${btoa(`${creds.apiKey}:${creds.apiSecret}`)}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Partial<CloudinaryResource>;
  if (typeof data.bytes !== "number" || typeof data.format !== "string") return null;
  return { bytes: data.bytes, format: data.format, width: data.width ?? 0, height: data.height ?? 0 };
}

/** Delete images from Cloudinary (best effort; failures leave an orphan, never break the caller). */
export async function destroyImages(storagePaths: string[]): Promise<void> {
  const creds = credentials();
  if (!creds) return;
  await Promise.all(
    storagePaths.map(async (path) => {
      const params = { public_id: cloudinaryPublicId(path), timestamp: Math.floor(Date.now() / 1000), invalidate: "true" };
      const signature = await cloudinarySignature(params, creds.apiSecret);
      const body = new URLSearchParams({ ...params, timestamp: String(params.timestamp), api_key: creds.apiKey, signature });
      await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/destroy`, { method: "POST", body }).catch(() => undefined);
    }),
  );
}
