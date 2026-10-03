import { MessagesSquare, PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/community/components/post-card";
import { getMyReactions, listFeed } from "@/features/community/queries";
import { getCommunityOptions } from "@/features/locations/queries";
import { getViewer } from "@/lib/auth/session";
import { uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const explicit = uuidParam(sp.community);
  const communityId = explicit ?? (sp.community === undefined ? viewer?.profile.home_community_id ?? undefined : undefined);
  const page = parsePage(sp.page);
  const [feed, communities] = await Promise.all([listFeed({ communityId, page }), getCommunityOptions()]);
  const reactions = await getMyReactions(feed.items.map((p) => p.id), viewer?.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Community"
        description="News, questions and recommendations from your neighbours and verified organisations."
        actions={<Button asChild><Link href="/community/new"><PlusCircle aria-hidden /> New post</Link></Button>}
      />
      <CommunityFilter options={communities} value={communityId} />
      {feed.items.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No posts yet" description="Start the conversation in your community." action={<Button asChild><Link href="/community/new">Create a post</Link></Button>} />
      ) : (
        <div className="space-y-3">
          {feed.items.map((post) => (
            <PostCard key={post.id} post={post} reacted={reactions.has(post.id)} viewerId={viewer?.id} />
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={feed.pageSize} total={feed.total} basePath="/community" searchParams={{ community: explicit ?? (sp.community === undefined ? undefined : "all") }} />
    </div>
  );
}
