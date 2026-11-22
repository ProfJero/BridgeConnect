import { MessagesSquare, PenSquare, PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination, parsePage } from "@/components/shared/pagination";
import { CategoryChips } from "@/components/shared/category-chips";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/community/components/post-card";
import { getMyReactions, getPolls, listFeed } from "@/features/community/queries";
import { getCommunityOptions } from "@/features/locations/queries";
import { getViewer } from "@/lib/auth/session";
import { uuidParam } from "@/lib/search-params";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Community",
  description:
    "Local news, questions, recommendations and lost & found posts from your neighbours.",
  path: "/community",
  image: "/og/community.png",
});

const FILTERS = [
  { slug: "announcements", name: "Announcements", kinds: ["announcement" as const] },
  { slug: "questions", name: "Questions", kinds: ["question" as const, "recommendation" as const] },
  { slug: "help", name: "Help", kinds: ["help_request" as const, "help_offer" as const] },
  { slug: "lost-found", name: "Lost & found", kinds: ["lost_and_found" as const] },
  { slug: "polls", name: "Polls", kinds: ["poll" as const] },
];

export default async function CommunityPage({ searchParams }: PageProps<"/community">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const explicit = uuidParam(sp.community);
  const communityId = explicit ?? (sp.community === undefined ? viewer?.profile.home_community_id ?? undefined : undefined);
  const page = parsePage(sp.page);
  const filter = FILTERS.find((f) => f.slug === sp.show);
  const [feed, communities] = await Promise.all([listFeed({ communityId, page, kinds: filter?.kinds }), getCommunityOptions()]);
  const [reactions, polls] = await Promise.all([
    getMyReactions(feed.items.map((p) => p.id), viewer?.id),
    getPolls(feed.items, viewer?.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Community"
        description="News, questions and recommendations from your neighbours and verified organisations."
        actions={<Button asChild className="hidden rounded-full sm:inline-flex"><Link href="/community/new"><PlusCircle aria-hidden /> New post</Link></Button>}
      />
      <CommunityFilter options={communities} value={communityId} />
      <CategoryChips
        basePath="/community"
        param="show"
        label="Post type"
        categories={FILTERS}
        active={filter?.slug}
        preserve={{ community: explicit ?? (sp.community === undefined ? undefined : "all") }}
      />
      {feed.items.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No posts yet" description="Start the conversation in your community." action={<Button asChild><Link href="/community/new">Create a post</Link></Button>} />
      ) : (
        <div className="stagger space-y-3">
          {feed.items.map((post) => (
            <PostCard key={post.id} post={post} reacted={reactions.has(post.id)} viewerId={viewer?.id} poll={polls.get(post.id)} />
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={feed.pageSize} total={feed.total} basePath="/community" searchParams={{ community: explicit ?? (sp.community === undefined ? undefined : "all"), show: filter?.slug }} />
      <Link
        href="/community/new"
        aria-label="Create a post"
        className="pressable fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 sm:hidden"
      >
        <PenSquare aria-hidden className="size-6" />
      </Link>
    </div>
  );
}
