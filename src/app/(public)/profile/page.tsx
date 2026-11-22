import {
  BellRing,
  Bike,
  Bookmark,
  Building2,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  House,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageSquareText,
  Package,
  Pencil,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { PostCard } from "@/features/community/components/post-card";
import { getMyReactions, getPolls, listFeed } from "@/features/community/queries";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { getCommunityName } from "@/features/locations/queries";
import { requireViewer } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { noIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My profile", robots: noIndex };

type MenuItem = { href: string; label: string; icon: LucideIcon; hint?: string };

function Menu({ items, label }: { items: MenuItem[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map(({ href, label: text, icon: Icon, hint }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent active:bg-accent">
              <Icon aria-hidden className="size-5 text-muted-foreground" />
              <span className="flex-1 text-[15px] font-medium">{text}</span>
              {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function ProfilePage() {
  const viewer = await requireViewer("/profile");
  const supabase = await createClient();
  const head = { count: "exact" as const, head: true };
  const [community, posts, favs, orders, reviews, trips, rider] = await Promise.all([
    getCommunityName(viewer.profile.home_community_id),
    listFeed({ authorId: viewer.id, pageSize: 5 }),
    supabase.from("favourites").select("id", head).eq("user_id", viewer.id),
    supabase.from("orders").select("id", head).eq("buyer_id", viewer.id),
    supabase.from("entity_reviews").select("id", head).eq("author_id", viewer.id),
    supabase.from("trips").select("id", head).eq("customer_id", viewer.id),
    supabase.from("rider_profiles").select("status").eq("user_id", viewer.id).maybeSingle(),
  ]);
  const [reactions, polls] = await Promise.all([
    getMyReactions(posts.items.map((p) => p.id), viewer.id),
    getPolls(posts.items, viewer.id),
  ]);
  const roles = [...new Set(viewer.grants.map((g) => g.scope))];
  const stats = [
    { label: "Favourites", value: favs.count ?? 0, href: "/favourites" },
    { label: "Orders", value: orders.count ?? 0, href: "/orders" },
    { label: "Trips", value: trips.count ?? 0, href: "/rides/history" },
    { label: "Reviews", value: reviews.count ?? 0, href: "/profile" },
  ];

  const activity: MenuItem[] = [
    { href: "/messages", label: "Messages", icon: MessageSquareText },
    { href: "/orders", label: "My orders", icon: Package },
    { href: "/bookings", label: "My bookings", icon: CalendarCheck },
    { href: "/rides/history", label: "Rides & deliveries", icon: Bike },
    { href: "/rentals/mine", label: "My rentals & enquiries", icon: House },
    { href: "/favourites", label: "Favourites", icon: Bookmark },
    { href: "/following", label: "Following", icon: BellRing },
    { href: "/jobs/applications", label: "Job applications", icon: ClipboardList },
  ];
  const earn: MenuItem[] = [
    { href: "/apply", label: "Register a business or organisation", icon: FileCheck2 },
    {
      href: "/rider",
      label: rider.data ? "Rider dashboard" : "Become a rider or driver",
      icon: Bike,
      hint: rider.data ? humanize(rider.data.status) : undefined,
    },
    { href: "/rentals/new", label: "List a property for rent", icon: House },
  ];
  const account: MenuItem[] = [
    { href: "/profile/edit", label: "Edit profile", icon: Pencil },
    { href: "/settings", label: "Settings & privacy", icon: Settings },
    { href: "/support", label: "Help & support", icon: LifeBuoy },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="-mx-4 -mt-4 overflow-hidden bg-gradient-to-br from-hero-1 to-hero-2 px-5 pt-6 pb-16 text-white sm:mx-0 sm:mt-0 sm:rounded-3xl lg:-mt-0">
        <div className="flex items-center gap-4">
          <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} className="size-20 border-4 border-white/30 text-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{viewer.profile.display_name}</h1>
            {viewer.profile.username ? <p className="text-sm opacity-80">@{viewer.profile.username}</p> : null}
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm opacity-90">
              <MapPin aria-hidden className="size-4" /> {community ? `${community.name} resident` : "Resident"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {viewer.profile.account_status !== "active" ? <StatusBadge status={viewer.profile.account_status} /> : null}
              {viewer.isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">
                  <Shield aria-hidden className="size-3" /> DBI {roles.includes("platform") ? "platform" : roles.map(humanize).join(", ")} admin
                </span>
              ) : null}
              {viewer.profile.is_demo ? <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold">Demo account</span> : null}
            </div>
          </div>
          <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/15 hover:text-white">
            <Link href="/settings" aria-label="Settings"><Settings aria-hidden className="size-5" /></Link>
          </Button>
        </div>
        {viewer.profile.bio ? <p className="mt-3 text-sm opacity-90">{viewer.profile.bio}</p> : null}
      </section>

      <div className="relative -mt-14 grid grid-cols-4 divide-x rounded-2xl border bg-card py-3 shadow-md">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-extrabold tabular-nums">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </Link>
        ))}
      </div>

      {viewer.isAdmin ? (
        <Button asChild variant="soft" className="w-full rounded-2xl"><Link href="/admin"><Shield aria-hidden /> Open Administration</Link></Button>
      ) : null}

      <Link href="/dashboards" className="pressable flex items-center gap-3 rounded-2xl bg-gradient-to-r from-hero-1 to-hero-2 p-4 text-white shadow-md">
        <LayoutDashboard aria-hidden className="size-6" />
        <span className="flex-1">
          <span className="block font-bold">My dashboards</span>
          <span className="block text-xs opacity-85">Businesses, organisations, rider and rentals you manage</span>
        </span>
        <ChevronRight aria-hidden className="size-5" />
      </Link>

      {viewer.workspaces.length > 0 ? (
        <Section title="My workspaces">
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {viewer.workspaces.map((w) => (
              <li key={w.entityId}>
                <Link href={`/workspace/${w.entityId}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent">
                  <Building2 aria-hidden className="size-5 text-link" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{w.name}</span>
                    <span className="block text-xs text-muted-foreground">{ENTITY_TYPE_LABEL[w.entityType]} · {humanize(w.role)}</span>
                  </span>
                  {w.status !== "active" ? <StatusBadge status={w.status} /> : <ChevronRight aria-hidden className="size-4 text-muted-foreground" />}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="My activity"><Menu label="My activity" items={activity} /></Section>
      <Section title="Earn & grow"><Menu label="Earn and grow" items={earn} /></Section>
      <Section title="Account"><Menu label="Account" items={account} /></Section>

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full rounded-2xl text-destructive hover:text-destructive">
          <LogOut aria-hidden /> Sign out
        </Button>
      </form>

      {posts.items.length ? (
        <Section title="My recent posts">
          <div className="space-y-3">
            {posts.items.map((p) => <PostCard key={p.id} post={p} reacted={reactions.has(p.id)} viewerId={viewer.id} poll={polls.get(p.id)} />)}
          </div>
        </Section>
      ) : null}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        BridgeConnect by Digital Bridge Initiative · <Link href="/about" className="underline">About</Link> ·{" "}
        <Link href="/about#privacy" className="underline">Privacy</Link> · <Link href="/about#terms" className="underline">Terms</Link>
      </p>
    </div>
  );
}
