"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function toggleFollowAction(entityId: string, follow: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(entityId).success || !z.boolean().safeParse(follow).success) return failure("Invalid organisation.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = follow
    ? await supabase.from("entity_follows").insert({ entity_id: entityId })
    : await supabase.from("entity_follows").delete().eq("entity_id", entityId).eq("user_id", auth.viewer.id);
  if (error && error.code !== "23505") return dbFailure(error, "follows.toggle");
  revalidatePath("/following");
  return success(follow ? "Following. You'll be notified of new posts and events." : "Unfollowed.");
}
