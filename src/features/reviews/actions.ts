"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { reviewResponseSchema, reviewSchema } from "./schemas";

/** Create the viewer's review, or update it if one exists (one review per entity). */
export async function saveReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const { entityId, rating, title, body } = parsed.data;
  if (auth.viewer.workspaces.some((w) => w.entityId === entityId)) {
    return failure("You can't review an organisation you belong to.");
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("entity_reviews")
    .select("id")
    .eq("entity_id", entityId)
    .eq("author_id", auth.viewer.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("entity_reviews").update({ rating, title: title || null, body }).eq("id", existing.id)
    : await supabase.from("entity_reviews").insert({ entity_id: entityId, rating, title: title || null, body });
  if (error) {
    if (error.code === "42501") return failure("This organisation isn't accepting reviews.");
    return dbFailure(error, "reviews.save");
  }
  revalidatePath("/directory/[slug]", "page");
  return success(existing ? "Your review was updated." : "Thanks! Your review is live.");
}

export async function deleteReviewAction(reviewId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(reviewId).success) return failure("Invalid review.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entity_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("author_id", auth.viewer.id)
    .select("id");
  if (error) return dbFailure(error, "reviews.delete");
  if (!data?.length) return failure("This review can't be deleted.");
  revalidatePath("/directory/[slug]", "page");
  return success("Review deleted.");
}

/** The entity's public reply (managers+; enforced by respond_to_review). Empty text removes it. */
export async function respondToReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewResponseSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_review", {
    p_review: parsed.data.reviewId,
    p_response: parsed.data.response,
  });
  if (error) return dbFailure(error, "reviews.respond");
  revalidatePath(`/workspace/${parsed.data.entityId}/reviews`);
  revalidatePath("/directory/[slug]", "page");
  return success(parsed.data.response ? "Reply published." : "Reply removed.");
}
