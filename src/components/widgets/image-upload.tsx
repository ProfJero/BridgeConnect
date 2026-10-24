"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { registerMediaAction, signMediaUploadAction } from "@/features/media/actions";
import { isCloudinaryEnabled } from "@/lib/cloudinary";
import { extensionFor, IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, PUBLIC_MEDIA_BUCKET, publicMediaUrl, validateFile } from "@/lib/storage";
import { getBrowserClient } from "@/lib/supabase/client";

export type UploadedImage = { id: string; path: string };

async function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return {};
  }
}

/** Upload straight to Cloudinary with a server-issued signature for this exact path. */
async function uploadToCloudinary(path: string, file: File, entityId?: string): Promise<string | null> {
  const signed = await signMediaUploadAction({ storagePath: path, entityId });
  if (!signed.ok || !signed.data) return signed.ok ? "Upload failed." : signed.error;
  const form = new FormData();
  for (const [k, v] of Object.entries(signed.data.fields)) form.append(k, v);
  form.append("file", file);
  try {
    const res = await fetch(signed.data.uploadUrl, { method: "POST", body: form });
    return res.ok ? null : "upload failed.";
  } catch {
    return "upload failed — check your connection.";
  }
}

/**
 * Uploads images directly to Cloudinary (when configured) or Supabase Storage
 * (public-media) under the owner's folder, then registers them. Type and size
 * are checked here, by Cloudinary/Storage and again on the server and database.
 */
export function ImageUpload({
  ownerFolder,
  entityId,
  max = 4,
  value,
  onChange,
  label = "Add photos",
}: {
  /** "users/<uid>" or "entities/<entityId>" */
  ownerFolder: string;
  entityId?: string;
  max?: number;
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = max - value.length;
    const selected = Array.from(files).slice(0, room);
    setBusy(true);
    const added: UploadedImage[] = [];
    for (const file of selected) {
      const check = validateFile(file, IMAGE_MIME_TYPES, MAX_IMAGE_BYTES);
      if (!check.ok) {
        toast.error(`${file.name}: ${check.error}`);
        continue;
      }
      const path = `${ownerFolder}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
      if (isCloudinaryEnabled()) {
        const problem = await uploadToCloudinary(path, file, entityId);
        if (problem) {
          toast.error(`${file.name}: ${problem}`);
          continue;
        }
      } else {
        const { error } = await getBrowserClient()
          .storage.from(PUBLIC_MEDIA_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
        if (error) {
          toast.error(`${file.name}: upload failed.`);
          continue;
        }
      }
      const dims = await readDimensions(file);
      const result = await registerMediaAction({
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
        entityId,
        ...dims,
      });
      if (result.ok && result.data) added.push(result.data);
      else toast.error(result.ok ? "Upload failed." : result.error);
    }
    onChange([...value, ...added]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {value.map((img) => (
            <li key={img.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <Image src={publicMediaUrl(img.path, 240)!} alt="" fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v.id !== img.id))}
                className="absolute top-1 right-1 rounded-full bg-foreground/70 p-1 text-white"
                aria-label="Remove photo"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < max ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_MIME_TYPES.join(",")}
            multiple={max > 1}
            className="sr-only"
            id={`upload-${ownerFolder}`}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : <ImagePlus aria-hidden />}
            {busy ? "Uploading…" : label}
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB each.</p>
        </>
      ) : null}
    </div>
  );
}
