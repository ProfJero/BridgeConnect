"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { failure, success, validationFailure, type ActionResult } from "@/lib/action-result";
import { guardActiveViewer } from "@/lib/auth/action-guard";
import { dbFailure } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { commentSchema, createPostSchema, editPostSchema } from "./schemas";

export async function createPostAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;

  const { communityId, kind, title, body, entityId, mediaIds, pollOptions, pollDays } = parsed.data;
  // UX-level check; the database enforces membership + capability (RLS).
  if (entityId && !auth.viewer.workspaces.some((w) => w.entityId === entityId)) {
    return failure("You can only post for workspaces you belong to.");
  }
  if (kind === "announcement" && !entityId) {
    return failure("Only verified organisations can publish announcements.", { kind: ["Choose another type."] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      community_id: communityId,
      kind,
      title: title || null,
      body,
      entity_id: entityId || null,
      poll_closes_at: kind === "poll" ? new Date(Date.now() + (pollDays ?? 7) * 86_400_000).toISOString() : null,
    })
    .select("id, status")
    .single();
  if (error) return dbFailure(error, "community.createPost");

  if (kind === "poll") {
    const options = (pollOptions ?? []).map((o) => o.trim()).filter(Boolean);
    const { error: pollError } = await supabase
      .from("poll_options")
      .insert(options.map((label, position) => ({ post_id: data.id, label, position })));
    if (pollError) {
      // Never leave a poll without options behind.
      await supabase.from("posts").delete().eq("id", data.id);
      return dbFailure(pollError, "community.createPoll");
    }
  }

  if (mediaIds?.length) {
    const { error: mediaError } = await supabase
      .from("post_media")
      .insert(mediaIds.map((media_id, position) => ({ post_id: data.id, media_id, position })));
    if (mediaError) return dbFailure(mediaError, "community.attachMedia");
  }

  revalidatePath("/community");
  revalidatePath("/");
  return success(
    data.status === "pending_review" ? "Your post was submitted for review." : "Your post is live.",
    data,
  );
}

export async function editPostAction(input: unknown): Promise<ActionResult> {
  const parsed = editPostSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ title: parsed.data.title || null, body: parsed.data.body })
    .eq("id", parsed.data.postId)
    .select("id");
  if (error) return dbFailure(error, "community.editPost");
  if (!data?.length) return failure("This post can't be edited.");
  revalidatePath(`/community/posts/${parsed.data.postId}`);
  return success("Post updated.");
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(postId).success) return failure("Invalid post.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");
  if (error) return dbFailure(error, "community.deletePost");
  if (!data?.length) return failure("This post can't be deleted.");
  revalidatePath("/community");
  return success("Post deleted.");
}

export async function addCommentAction(input: unknown): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").insert({ post_id: parsed.data.postId, body: parsed.data.body });
  if (error) return dbFailure(error, "community.addComment");
  revalidatePath(`/community/posts/${parsed.data.postId}`);
  return success("Comment posted.");
}

export async function deleteCommentAction(commentId: string, postId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(commentId).success || !z.uuid().safeParse(postId).success) return failure("Invalid comment.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase.from("post_comments").delete().eq("id", commentId).select("id");
  if (error) return dbFailure(error, "community.deleteComment");
  if (!data?.length) return failure("This comment can't be deleted.");
  revalidatePath(`/community/posts/${postId}`);
  return success("Comment deleted.");
}

export async function toggleReactionAction(postId: string, react: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(postId).success) return failure("Invalid post.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { error } = react
    ? await supabase.from("post_reactions").upsert({ post_id: postId }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
    : await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", auth.viewer.id);
  if (error) return dbFailure(error, "community.react");
  return success();
}

export async function votePollAction(postId: string, optionId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(postId).success || !z.uuid().safeParse(optionId).success) return failure("Invalid vote.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  // Changing a vote = withdraw + vote again; the database checks the poll is open and the option belongs to it.
  const { error: delError } = await supabase.from("poll_votes").delete().eq("post_id", postId).eq("user_id", auth.viewer.id);
  if (delError) return dbFailure(delError, "community.unvote");
  const { error } = await supabase.from("poll_votes").insert({ post_id: postId, option_id: optionId });
  if (error) return dbFailure(error, "community.vote");
  revalidatePath(`/community/posts/${postId}`);
  return success("Vote recorded.");
}

export async function setPostResolvedAction(postId: string, resolved: boolean): Promise<ActionResult> {
  if (!z.uuid().safeParse(postId).success || !z.boolean().safeParse(resolved).success) return failure("Invalid post.");
  const auth = await guardActiveViewer();
  if (!auth.ok) return auth.result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", postId)
    .eq("author_id", auth.viewer.id)
    .select("id");
  if (error) return dbFailure(error, "community.resolve");
  if (!data?.length) return failure("Only the author can change this post.");
  revalidatePath(`/community/posts/${postId}`);
  revalidatePath("/community");
  return success(resolved ? "Marked as resolved." : "Marked as open again.");
}
