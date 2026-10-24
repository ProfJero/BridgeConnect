"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { VERIFICATION_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

import { applicationSchema, attachDocumentSchema, updateApplicationSchema } from "./schemas";

export async function submitApplicationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_applications")
    .insert({
      entity_type: v.entityType,
      proposed_name: v.proposedName,
      sector: v.sector,
      community_id: v.communityId,
      description: v.description,
      address: v.address || null,
      contact_phone: v.contactPhone,
      contact_email: v.contactEmail || null,
      registration_number: v.registrationNumber || null,
      applicant_position: v.applicantPosition || null,
    })
    .select("id")
    .single();
  if (error) return dbFailure(error, "applications.submit");
  revalidatePath("/apply");
  return success("Application submitted. Add your supporting documents next.", { id: data.id });
}

export async function updateApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = updateApplicationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_applications")
    .update({
      proposed_name: v.proposedName,
      sector: v.sector,
      description: v.description,
      address: v.address || null,
      contact_phone: v.contactPhone,
      contact_email: v.contactEmail || null,
      registration_number: v.registrationNumber || null,
      applicant_position: v.applicantPosition || null,
    })
    .eq("id", v.applicationId)
    .select("id");
  if (error) return dbFailure(error, "applications.update");
  if (!data?.length) return failure("This application can no longer be edited.");
  revalidatePath(`/apply/${v.applicationId}`);
  return success("Changes saved.");
}

export async function attachDocumentAction(input: unknown): Promise<ActionResult> {
  const parsed = attachDocumentSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid document.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const v = parsed.data;
  if (!v.storagePath.startsWith(`${auth.viewer.id}/${v.applicationId}/`)) return failure("Invalid upload location.");
  const supabase = await createClient();
  const { error } = await supabase.from("application_documents").insert({
    application_id: v.applicationId,
    document_type: v.documentType,
    storage_path: v.storagePath,
    file_name: v.fileName,
    mime_type: v.mimeType,
    size_bytes: v.sizeBytes,
  });
  if (error) {
    await supabase.storage.from(VERIFICATION_BUCKET).remove([v.storagePath]);
    return dbFailure(error, "applications.attachDocument");
  }
  revalidatePath(`/apply/${v.applicationId}`);
  return success("Document uploaded.");
}

export async function removeDocumentAction(documentId: string, applicationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(documentId).success || !z.uuid().safeParse(applicationId).success) {
    return failure("Invalid document.");
  }
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("application_documents")
    .delete()
    .eq("id", documentId)
    .select("storage_path");
  if (error) return dbFailure(error, "applications.removeDocument");
  if (!data?.length) return failure("This document can no longer be removed.");
  await supabase.storage.from(VERIFICATION_BUCKET).remove(data.map((d) => d.storage_path));
  revalidatePath(`/apply/${applicationId}`);
  return success("Document removed.");
}

const noteSchema = z.object({ applicationId: z.uuid(), note: z.string().trim().max(2000).optional() });

export async function resubmitApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("resubmit_entity_application", {
    p_application: parsed.data.applicationId,
    p_note: parsed.data.note || undefined,
  });
  if (error) return dbFailure(error, "applications.resubmit");
  revalidatePath(`/apply/${parsed.data.applicationId}`);
  return success("Resubmitted for review.");
}

export async function withdrawApplicationAction(applicationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(applicationId).success) return failure("Invalid application.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_entity_application", { p_application: applicationId });
  if (error) return dbFailure(error, "applications.withdraw");
  revalidatePath(`/apply/${applicationId}`);
  return success("Application withdrawn.");
}
