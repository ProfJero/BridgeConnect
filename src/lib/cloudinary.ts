import { env } from "@/lib/env";

/**
 * Cloudinary delivery helpers (safe in client and server code). Public images keep the same logical path as
 * before — `users/<uid>/<uuid>.jpg` or `entities/<id>/<uuid>.jpg`, which the database CHECKs ownership of — and
 * are stored in Cloudinary under `bridgeconnect/<path without extension>`.
 */
export const CLOUDINARY_ROOT_FOLDER = "bridgeconnect";
export const CLOUDINARY_FORMATS = ["jpg", "png", "webp"] as const;

export function isCloudinaryEnabled(): boolean {
  return Boolean(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}

/** `users/<uid>/<uuid>.jpg` → `bridgeconnect/users/<uid>/<uuid>` */
export function cloudinaryPublicId(storagePath: string): string {
  return `${CLOUDINARY_ROOT_FOLDER}/${storagePath.replace(/\.[a-z0-9]+$/i, "")}`;
}

/**
 * Optimised delivery URL: automatic format (WebP/AVIF where supported) and quality, never upscaled, capped at
 * `width` — this is what keeps pages light on mobile data.
 */
export function cloudinaryImageUrl(storagePath: string, width = 1600): string {
  const id = cloudinaryPublicId(storagePath).split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${id}`;
}
