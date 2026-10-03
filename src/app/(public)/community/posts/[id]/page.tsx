import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CommentForm, CommentList } from "@/features/community/components/comments";
import { PostCard } from "@/features/community/components/post-card";
import { DeletePostButton } from "@/features/community/components/post-owner-actions";
import { getMyReactions, getPost, listComments } from "@/features/community/queries";
import { getViewer, isUuid } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: PageProps<"/community/posts/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [post, viewer] = await Promise.all([getPost(id), getViewer()]);
  if (!post) notFound();
  const [comments, reactions] = await Promise.all([listComments(id), getMyReactions([id], viewer?.id)]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/community"><ArrowLeft aria-hidden /> Community</Link>
      </Button>
      <PostCard post={post} reacted={reactions.has(id)} viewerId={viewer?.id} linkToDetail={false} />
      {viewer?.id === post.author_id ? <DeletePostButton postId={post.id} /> : null}
      <Section title={`Comments (${post.comment_count})`}>
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <CommentList postId={post.id} comments={comments} viewerId={viewer?.id} />
          {post.status !== "published" ? null : viewer?.isActive ? (
            <CommentForm postId={post.id} />
          ) : !viewer ? (
            <Button asChild variant="outline" className="w-full"><Link href={`/sign-in?next=/community/posts/${post.id}`}>Sign in to comment</Link></Button>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
