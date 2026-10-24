"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { getViewer } from "@/lib/auth/session";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return failure("Invalid notification.");
  if (!(await getViewer())) return failure("Please sign in.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) return dbFailure(error, "notifications.read");
  revalidatePath("/notifications");
  return success();
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  if (!(await getViewer())) return failure("Please sign in.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return dbFailure(error, "notifications.readAll");
  revalidatePath("/notifications");
  return success("All caught up.");
}

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return failure("Invalid notification.");
  if (!(await getViewer())) return failure("Please sign in.");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) return dbFailure(error, "notifications.delete");
  revalidatePath("/notifications");
  return success();
}
