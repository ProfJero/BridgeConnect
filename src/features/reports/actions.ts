"use server";

import { success, validationFailure, failure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

import { reportSchema } from "./schemas";

const COLUMN = {
  post: "post_id",
  comment: "comment_id",
  entity: "entity_id",
  product: "product_id",
  service: "service_id",
  job: "job_id",
  event: "event_id",
  profile: "profile_id",
} as const;

export async function submitReportAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  if (parsed.data.targetKind === "profile" && parsed.data.targetId === auth.viewer.id) {
    return failure("You can't report yourself.");
  }
  const supabase = await createClient();
  const row: TablesInsert<"reports"> = { reason: parsed.data.reason, details: parsed.data.details || null };
  row[COLUMN[parsed.data.targetKind]] = parsed.data.targetId;
  const { error } = await supabase.from("reports").insert(row);
  if (error) {
    if (error.code === "23505") return success("You've already reported this. Our moderators will review it.");
    return dbFailure(error, "reports.submit");
  }
  return success("Thank you. Our moderators will review your report.");
}
