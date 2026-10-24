"use client";

import { FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { controlProps, Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { JOB_APPLICATIONS_BUCKET, MAX_CV_BYTES, validateFile } from "@/lib/storage";
import { getBrowserClient } from "@/lib/supabase/client";

import { applyForJobAction } from "../actions";
import { jobApplicationSchema } from "../schemas";

export function ApplyForm({ jobId, userId }: { jobId: string; userId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [cvName, setCvName] = useState<string | null>(null);
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(jobApplicationSchema, applyForJobAction, {
    defaultValues: { jobId, coverLetter: "", contactPhone: "" },
    onSuccess: () => router.refresh(),
  });

  async function uploadCv(file: File | undefined) {
    if (!file) return;
    const check = validateFile(file, ["application/pdf"], MAX_CV_BYTES);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    // Private bucket, applicant's own folder; only the applicant and the
    // hiring entity's editors can read it (Storage RLS).
    const path = `${userId}/${jobId}/${crypto.randomUUID()}.pdf`;
    const { error } = await getBrowserClient()
      .storage.from(JOB_APPLICATIONS_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    setUploading(false);
    if (error) {
      toast.error("CV upload failed. Please try again.");
      return;
    }
    form.setValue("cvPath", path);
    setCvName(file.name);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="coverLetter" label="Why are you a good fit?" required error={errorFor("coverLetter")}>
        <Textarea rows={6} maxLength={5000} {...controlProps("coverLetter", errorFor("coverLetter"))} {...form.register("coverLetter")} />
      </Field>
      <Field id="contactPhone" label="Phone number" required error={errorFor("contactPhone")}>
        <Input type="tel" autoComplete="tel" placeholder="+233 24 123 4567" {...controlProps("contactPhone", errorFor("contactPhone"))} {...form.register("contactPhone")} />
      </Field>
      <Field id="cv" label="CV (PDF)" hint="PDF up to 5 MB. Only this employer can see it.">
        <Input id="cv" type="file" accept="application/pdf" aria-describedby="cv-hint" onChange={(e) => void uploadCv(e.target.files?.[0])} disabled={uploading} />
      </Field>
      {uploading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 aria-hidden className="size-4 animate-spin" /> Uploading CV…</p>
      ) : cvName ? (
        <p className="flex items-center gap-2 text-sm text-brand-green-soft-foreground" role="status"><FileText aria-hidden className="size-4" /> {cvName} attached</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending || uploading}>
        {pending ? "Sending application…" : "Submit application"}
      </Button>
    </form>
  );
}
