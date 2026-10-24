import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EntityAvatar, UserAvatar } from "@/components/shared/avatars";
import { StatusBadge } from "@/components/shared/status-badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ReportDialog } from "@/components/widgets/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { orderedMedia } from "@/lib/media";
import { publicMediaUrl } from "@/lib/storage";

import type { PostData } from "../queries";
import { POST_KIND_LABEL } from "../schemas";
import { ReactionButton } from "./reaction-button";

export function PostCard({
  post,
  reacted,
  viewerId,
  linkToDetail = true,
}: {
  post: PostData;
  reacted: boolean;
  viewerId?: string;
  linkToDetail?: boolean;
}) {
  const media = orderedMedia(post.post_media);
  const byEntity = post.entities;
  const authorName = byEntity?.name ?? post.profiles?.display_name ?? "Resident";
  const body = linkToDetail && post.body.length > 400 ? `${post.body.slice(0, 400)}…` : post.body;

  return (
    <article className="rounded-xl border bg-card shadow-xs" aria-labelledby={`post-${post.id}-author`}>
      <div className="flex items-start gap-3 p-4 pb-2">
        {byEntity ? (
          <EntityAvatar name={byEntity.name} path={byEntity.logo_path} className="size-10" />
        ) : (
          <UserAvatar name={authorName} path={post.profiles?.avatar_path} className="size-10" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {byEntity ? (
              <Link id={`post-${post.id}-author`} href={`/directory/${byEntity.slug}`} className="font-semibold hover:underline">
                {authorName}
              </Link>
            ) : (
              <span id={`post-${post.id}-author`} className="font-semibold">
                {authorName}
              </span>
            )}
            {byEntity ? <VerifiedBadge compact /> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            <time dateTime={post.created_at}>{formatRelative(post.created_at)}</time>
            {post.communities?.name ? ` · ${post.communities.name}` : null}
            {post.edited_at ? " · edited" : null}
          </p>
        </div>
        <Badge variant={post.kind === "announcement" ? "green" : "secondary"}>{POST_KIND_LABEL[post.kind]}</Badge>
      </div>

      <div className="space-y-2 px-4">
        {post.status !== "published" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={post.status} />
            {post.moderation_reason ? <span>{post.moderation_reason}</span> : null}
          </div>
        ) : null}
        {post.title ? <h3 className="font-semibold">{post.title}</h3> : null}
        <p className="text-sm leading-relaxed whitespace-pre-line">{body}</p>
        {media.length > 0 ? (
          <div className={media.length === 1 ? "grid" : "grid grid-cols-2 gap-1.5"}>
            {media.map((m) => (
              <div key={m.path} className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <Image src={publicMediaUrl(m.path)!} alt={m.alt} fill sizes="(min-width: 768px) 600px, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1 border-t px-2 py-1 mt-3">
        <ReactionButton postId={post.id} count={post.reaction_count} reacted={reacted} signedIn={Boolean(viewerId)} />
        {linkToDetail ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/community/posts/${post.id}`}>
              <MessageCircle aria-hidden />
              {post.comment_count > 0 ? `${post.comment_count} comments` : "Comment"}
            </Link>
          </Button>
        ) : null}
        <div className="flex-1" />
        {viewerId !== post.author_id ? (
          <ReportDialog targetKind="post" targetId={post.id} signedIn={Boolean(viewerId)} />
        ) : null}
      </div>
    </article>
  );
}
