"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { jobApplicationSchema } from "./schemas";

export async function applyForJobAction(input: unknown): Promise<ActionResult> {
  const parsed = jobApplicationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const { jobId, coverLetter, contactPhone, cvPath } = parsed.data;
  if (cvPath && !cvPath.startsWith(`${auth.viewer.id}/${jobId}/`)) return failure("Invalid CV upload.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("job_applications")
    .insert({ job_id: jobId, cover_letter: coverLetter, contact_phone: contactPhone, cv_path: cvPath || null });
  if (error) {
    if (error.code === "23505") return failure("You've already applied for this job.");
    return dbFailure(error, "jobs.apply");
  }
  revalidatePath("/jobs/applications");
  return success("Application sent. You'll be notified when the employer responds.");
}

export async function withdrawJobApplicationAction(applicationId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(applicationId).success) return failure("Invalid application.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_job_application_status", {
    p_application: applicationId,
    p_status: "withdrawn",
  });
  if (error) return dbFailure(error, "jobs.withdraw");
  revalidatePath("/jobs/applications");
  return success("Application withdrawn.");
}
