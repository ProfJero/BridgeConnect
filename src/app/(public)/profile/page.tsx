import { Bookmark, Building2, ClipboardList, FileCheck2, MapPin, Package, Pencil, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/features/community/components/post-card";
import { getMyReactions, listFeed } from "@/features/community/queries";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { getCommunityName } from "@/features/locations/queries";
import { requireViewer } from "@/lib/auth/session";
import { humanize } from "@/lib/format";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const viewer = await requireViewer("/profile");
  const [community, posts] = await Promise.all([
    getCommunityName(viewer.profile.home_community_id),
    listFeed({ authorId: viewer.id, pageSize: 10 }),
  ]);
  const reactions = await getMyReactions(posts.items.map((p) => p.id), viewer.id);
  const roles = [...new Set(viewer.grants.map((g) => g.scope))];
  const links = [
    { href: "/favourites", label: "Favourites", icon: Bookmark },
    { href: "/orders", label: "My orders", icon: Package },
    { href: "/jobs/applications", label: "Job applications", icon: ClipboardList },
    { href: "/apply", label: "Register an organisation", icon: FileCheck2 },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center">
        <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} className="size-20 text-lg" />
        <div>
          <h1 className="text-xl font-bold">{viewer.profile.display_name}</h1>
          {viewer.profile.username ? <p className="text-sm text-muted-foreground">@{viewer.profile.username}</p> : null}
          {community ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground"><MapPin aria-hidden className="size-4" /> {community.name}, {community.districtName}</p>
          ) : null}
        </div>
        {viewer.profile.bio ? <p className="max-w-md text-sm">{viewer.profile.bio}</p> : null}
        <div className="flex flex-wrap justify-center gap-2">
          {viewer.profile.account_status !== "active" ? <StatusBadge status={viewer.profile.account_status} /> : <Badge variant="secondary">Resident</Badge>}
          {viewer.isAdmin ? <Badge variant="soft"><Shield aria-hidden /> DBI {roles.includes("platform") ? "platform" : roles.map(humanize).join(", ")} administrator</Badge> : null}
          {viewer.profile.is_demo ? <Badge variant="warning">Demo account</Badge> : null}
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/profile/edit"><Pencil aria-hidden /> Edit profile</Link></Button>
      </section>

      <nav aria-label="Account" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-medium hover:shadow-md">
            <Icon aria-hidden className="size-5 text-primary" /> {label}
          </Link>
        ))}
      </nav>

      {viewer.workspaces.length > 0 ? (
        <Section title="My workspaces">
          <ul className="divide-y rounded-xl border bg-card">
            {viewer.workspaces.map((w) => (
              <li key={w.entityId}>
                <Link href={`/workspace/${w.entityId}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                  <span className="flex items-center gap-3">
                    <Building2 aria-hidden className="size-5 text-muted-foreground" />
                    <span>
                      <span className="block font-semibold">{w.name}</span>
                      <span className="block text-xs text-muted-foreground">{ENTITY_TYPE_LABEL[w.entityType]} · {humanize(w.role)}</span>
                    </span>
                  </span>
                  {w.status !== "active" ? <StatusBadge status={w.status} /> : null}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {viewer.isAdmin ? (
        <Button asChild variant="soft" className="w-full"><Link href="/admin"><Shield aria-hidden /> Open DBI Administration</Link></Button>
      ) : null}

      <Section title="My posts">
        {posts.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t posted yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.items.map((p) => <PostCard key={p.id} post={p} reacted={reactions.has(p.id)} viewerId={viewer.id} />)}
          </div>
        )}
      </Section>
    </div>
  );
}
