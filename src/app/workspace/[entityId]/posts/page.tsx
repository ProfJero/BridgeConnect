import { MessagesSquare, PlusCircle } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listEntityPosts } from "@/features/workspace/queries";
import { requireWorkspaceCapability } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";

export default async function WorkspacePostsPage({ params }: PageProps<"/workspace/[entityId]/posts">) {
  const { entityId } = await params;
  await requireWorkspaceCapability(entityId, "posts");
  const posts = await listEntityPosts(entityId);
  return (
    <div className="space-y-5">
      <PageHeader title="Posts & announcements" actions={<Button asChild><Link href={`/community/new?as=${entityId}`}><PlusCircle aria-hidden /> New post</Link></Button>} />
      {posts.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No posts yet" description="Share announcements and updates with your community." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/community/posts/${p.id}`} className="flex items-start justify-between gap-3 p-4 hover:bg-accent">
                <span className="min-w-0">
                  <span className="block font-semibold">{p.title ?? p.body.slice(0, 80)}</span>
                  <span className="block text-sm text-muted-foreground">{formatRelative(p.created_at)} · {p.reaction_count} helpful · {p.comment_count} comments</span>
                  {p.moderation_reason ? <span className="block text-sm text-destructive">{p.moderation_reason}</span> : null}
                </span>
                <StatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
