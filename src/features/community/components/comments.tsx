"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { controlProps, FormError } from "@/components/forms/field";
import { UserAvatar } from "@/components/shared/avatars";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import { useServerAction } from "@/hooks/use-server-action";
import { formatRelative } from "@/lib/format";

import { addCommentAction, deleteCommentAction } from "../actions";
import { commentSchema } from "../schemas";

type Comment = {
  id: string;
  body: string;
  status: string;
  created_at: string;
  author_id: string;
  profiles: { display_name: string; avatar_path: string | null } | null;
};

export function CommentList({ postId, comments, viewerId }: { postId: string; comments: Comment[]; viewerId?: string }) {
  const { pending, run } = useServerAction();
  if (comments.length === 0) return <p className="text-sm text-muted-foreground">No comments yet.</p>;
  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <UserAvatar name={c.profiles?.display_name ?? "Resident"} path={c.profiles?.avatar_path} className="size-8" />
          <div className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{c.profiles?.display_name ?? "Resident"}</p>
              <time className="text-xs text-muted-foreground" dateTime={c.created_at}>{formatRelative(c.created_at)}</time>
            </div>
            <p className="text-sm whitespace-pre-line">{c.status === "published" ? c.body : <em className="text-muted-foreground">This comment was hidden by a moderator.</em>}</p>
            <div className="-mx-2 mt-1 flex">
              {viewerId === c.author_id ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => deleteCommentAction(c.id, postId))}>
                  <Trash2 aria-hidden /> Delete
                </Button>
              ) : (
                <ReportDialog targetKind="comment" targetId={c.id} signedIn={Boolean(viewerId)} />
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const { form, onSubmit, pending, formError, errorFor } = useActionForm(commentSchema, addCommentAction, {
    defaultValues: { postId, body: "" },
    successToast: false,
    onSuccess: () => {
      form.reset({ postId, body: "" });
      router.refresh();
    },
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-2">
      <FormError message={formError} />
      <Label htmlFor="comment-body" className="sr-only">Write a comment</Label>
      <Textarea rows={2} placeholder="Write a comment…" maxLength={2000} {...controlProps("comment-body", errorFor("body"))} {...form.register("body")} />
      {errorFor("body") ? <p id="comment-body-error" role="alert" className="text-xs text-destructive">{errorFor("body")}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Posting…" : "Comment"}</Button>
      </div>
    </form>
  );
}
