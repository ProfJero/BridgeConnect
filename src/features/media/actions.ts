"use server";

import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { MAX_IMAGE_BYTES } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const registerSchema = z.object({
  storagePath: z.string().regex(/^(users|entities)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  altText: z.string().trim().max(300).optional(),
  entityId: z.uuid().optional(),
});

/**
 * Register an uploaded image in the media catalogue. The upload itself went
 * straight to Storage under the user's (or entity's) folder, which Storage RLS
 * enforced; the media_assets RLS + CHECK re-verify ownership of the path.
 */
export async function registerMediaAction(input: unknown): Promise<ActionResult<{ id: string; path: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid upload.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const expectedPrefix = v.entityId ? `entities/${v.entityId}/` : `users/${auth.viewer.id}/`;
  if (!v.storagePath.startsWith(expectedPrefix)) return failure("Invalid upload location.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      storage_path: v.storagePath,
      mime_type: v.mimeType,
      size_bytes: v.sizeBytes,
      width: v.width,
      height: v.height,
      alt_text: v.altText || null,
      entity_id: v.entityId ?? null,
    })
    .select("id, storage_path")
    .single();
  if (error) return dbFailure(error, "media.register");
  return success(undefined, { id: data.id, path: data.storage_path });
}
