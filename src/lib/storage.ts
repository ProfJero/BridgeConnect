import { env } from "@/lib/env";

export const PUBLIC_MEDIA_BUCKET = "public-media";
export const VERIFICATION_BUCKET = "verification-documents";
export const JOB_APPLICATIONS_BUCKET = "job-applications";

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DOCUMENT_MIME_TYPES = ["application/pdf", ...IMAGE_MIME_TYPES] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_CV_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function extensionFor(mime: string): string | null {
  return EXTENSION_BY_MIME[mime] ?? null;
}

/** Public URL for an object in the public-media bucket (no network call). */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const safe = path.split("/").map(encodeURIComponent).join("/");
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${safe}`;
}

export type FileCheck = { ok: true } | { ok: false; error: string };

/** Client- and server-side validation mirrored by Storage bucket limits. */
export function validateFile(
  file: { type: string; size: number },
  allowed: readonly string[],
  maxBytes: number,
): FileCheck {
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "This file type is not allowed." };
  }
  if (file.size <= 0) return { ok: false, error: "The file is empty." };
  if (file.size > maxBytes) {
    return { ok: false, error: `Files must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.` };
  }
  return { ok: true };
}
