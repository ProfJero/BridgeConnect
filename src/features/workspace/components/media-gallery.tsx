"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUpload, type UploadedImage } from "@/components/widgets/image-upload";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";
import { publicMediaUrl } from "@/lib/storage";

import { deleteEntityMediaAction } from "../actions";

export function MediaGallery({ entityId, items }: { entityId: string; items: { id: string; storage_path: string; alt_text: string | null }[] }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadedImage[]>([]);
  const { pending, run } = useServerAction();
  return (
    <div className="space-y-4">
      <ImageUpload
        ownerFolder={`entities/${entityId}`}
        entityId={entityId}
        max={10}
        value={uploads}
        label="Upload images"
        onChange={(imgs) => {
          setUploads([]);
          if (imgs.length) router.refresh();
        }}
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <li key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <Image src={publicMediaUrl(m.storage_path)!} alt={m.alt_text ?? ""} fill sizes="200px" className="object-cover" />
              <Button
                variant="destructive"
                size="icon-sm"
                className="absolute top-1 right-1"
                aria-label="Delete image"
                disabled={pending}
                onClick={() => run(() => deleteEntityMediaAction(entityId, m.id))}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
