"use server";

import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { isCloudinaryEnabled } from "@/lib/cloudinary";
import { destroyImages, getImageResource, signImageUpload, type SignedUpload } from "@/lib/cloudinary.server";
import { dbFailure } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const STORAGE_PATH = /^(users|entities)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/;

const signSchema = z.object({
  storagePath: z.string().regex(STORAGE_PATH),
  entityId: z.uuid().optional(),
});

const registerSchema = z.object({
  storagePath: z.string().regex(STORAGE_PATH),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  altText: z.string().trim().max(300).optional(),
  entityId: z.uuid().optional(),
});

/**
 * Sign one direct-to-Cloudinary image upload. Only the caller's own folder (or a workspace they belong to) can
 * be signed; the signature pins the exact public_id, forbids overwrites and restricts formats. Ownership is
 * enforced again by media_assets RLS when the upload is registered.
 */
export async function signMediaUploadAction(input: unknown): Promise<ActionResult<SignedUpload>> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid upload.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const { storagePath, entityId } = parsed.data;
  if (entityId && !auth.viewer.workspaces.some((w) => w.entityId === entityId)) {
    return failure("You can't upload images for this organisation.");
  }
  const expectedPrefix = entityId ? `entities/${entityId}/` : `users/${auth.viewer.id}/`;
  if (!storagePath.startsWith(expectedPrefix)) return failure("Invalid upload location.");
  const signed = await signImageUpload(storagePath);
  if (!signed) return failure("Image uploads are not configured yet. Please try again later.");
  return success(undefined, signed);
}

/**
 * Register an uploaded image in the media catalogue. The upload itself went
 * straight to Cloudinary (signed for this exact path) or to Supabase Storage
 * (Storage RLS); the media_assets RLS + CHECK re-verify ownership of the path.
 * With Cloudinary, size and format come from Cloudinary itself, not the client.
 */
export async function registerMediaAction(input: unknown): Promise<ActionResult<{ id: string; path: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid upload.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const expectedPrefix = v.entityId ? `entities/${v.entityId}/` : `users/${auth.viewer.id}/`;
  if (!v.storagePath.startsWith(expectedPrefix)) return failure("Invalid upload location.");

  let meta = { mime_type: v.mimeType, size_bytes: v.sizeBytes, width: v.width, height: v.height };
  if (isCloudinaryEnabled()) {
    const resource = await getImageResource(v.storagePath);
    if (!resource) return failure("Upload not found. Please try again.");
    const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[resource.format];
    if (!mime || resource.bytes > MAX_IMAGE_BYTES) {
      await destroyImages([v.storagePath]);
      return failure("Images must be JPG, PNG or WebP and at most 5 MB.");
    }
    meta = { mime_type: mime as typeof v.mimeType, size_bytes: resource.bytes, width: resource.width || undefined, height: resource.height || undefined };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      storage_path: v.storagePath,
      ...meta,
      alt_text: v.altText || null,
      entity_id: v.entityId ?? null,
    })
    .select("id, storage_path")
    .single();
  if (error) {
    if (isCloudinaryEnabled()) await destroyImages([v.storagePath]);
    return dbFailure(error, "media.register");
  }
  return success(undefined, { id: data.id, path: data.storage_path });
}
