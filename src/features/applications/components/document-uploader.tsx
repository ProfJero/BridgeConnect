"use client";

import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerAction } from "@/hooks/use-server-action";
import { DOCUMENT_MIME_TYPES, extensionFor, MAX_DOCUMENT_BYTES, validateFile, VERIFICATION_BUCKET } from "@/lib/storage";
import { getBrowserClient } from "@/lib/supabase/client";

import { attachDocumentAction, removeDocumentAction } from "../actions";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES } from "../schemas";

type Doc = { id: string; document_type: (typeof DOCUMENT_TYPES)[number]; file_name: string; size_bytes: number; url?: string };

export function DocumentUploader({
  applicationId,
  userId,
  documents,
  editable,
}: {
  applicationId: string;
  userId: string;
  documents: Doc[];
  editable: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<(typeof DOCUMENT_TYPES)[number]>("business_registration");
  const [uploading, setUploading] = useState(false);
  const { pending, run } = useServerAction();

  async function upload(file: File | undefined) {
    if (!file) return;
    const check = validateFile(file, DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    const path = `${userId}/${applicationId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const { error } = await getBrowserClient().storage.from(VERIFICATION_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (error) {
      toast.error("Upload failed. Please try again.");
      return;
    }
    run(() =>
      attachDocumentAction({
        applicationId,
        documentType: docType,
        storagePath: path,
        fileName: file.name.slice(0, 200),
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    );
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-3">
              <span className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary underline">{d.file_name}</a>
                  ) : (
                    <span className="block truncate text-sm font-medium">{d.file_name}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">{DOCUMENT_TYPE_LABEL[d.document_type]} · {(d.size_bytes / 1024).toFixed(0)} KB</span>
                </span>
              </span>
              {editable ? (
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.file_name}`} disabled={pending} onClick={() => run(() => removeDocumentAction(d.id, applicationId))}>
                  <Trash2 aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {editable ? (
        <div className="grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="docType">Document type</Label>
            <NativeSelect id="docType" value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>)}
            </NativeSelect>
          </div>
          <input ref={fileRef} type="file" className="sr-only" id="docFile" accept={DOCUMENT_MIME_TYPES.join(",")} onChange={(e) => void upload(e.target.files?.[0])} />
          <Button type="button" variant="outline" disabled={uploading || pending} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 aria-hidden className="animate-spin" /> : <Upload aria-hidden />}
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-2">PDF, JPG, PNG or WebP up to 10 MB. Documents are private: only you and DBI verification officers can see them.</p>
        </div>
      ) : null}
    </div>
  );
}
