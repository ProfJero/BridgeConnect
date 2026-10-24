import "server-only";

import { VERIFICATION_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export async function listMyApplications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_applications")
    .select("id, proposed_name, entity_type, status, submitted_at, decided_at, entity_id")
    .eq("applicant_id", userId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Application detail. RLS: applicant or in-scope reviewers only. */
export async function getApplication(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_applications")
    .select(
      "*, communities(name, districts(name)), profiles!entity_applications_applicant_id_fkey(display_name), application_documents(id, document_type, file_name, mime_type, size_bytes, storage_path, created_at), application_events(id, event, note, is_internal, created_at, actor_id, profiles(display_name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Short-lived signed URLs; Storage RLS decides who may sign them. */
export async function signDocumentUrls(paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(VERIFICATION_BUCKET).createSignedUrls(paths, 300);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}
