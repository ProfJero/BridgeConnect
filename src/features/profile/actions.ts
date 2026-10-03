"use server";

import { revalidatePath } from "next/cache";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { profileSchema } from "./schemas";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const { avatarPath } = parsed.data;
  if (avatarPath && !avatarPath.startsWith(`users/${auth.viewer.id}/`)) return failure("Invalid photo.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      username: parsed.data.username || null,
      bio: parsed.data.bio || null,
      home_community_id: parsed.data.homeCommunityId || null,
      ...(avatarPath !== undefined ? { avatar_path: avatarPath } : {}),
    })
    .eq("id", auth.viewer.id);
  if (error) {
    if (error.code === "23505") return failure("That username is taken.", { username: ["That username is taken."] });
    return dbFailure(error, "profile.update");
  }
  revalidatePath("/", "layout");
  return success("Profile saved.");
}
