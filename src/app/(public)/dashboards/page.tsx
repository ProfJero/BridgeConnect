import { ArrowRight, Bike, Building2, FileCheck2, House, PlusCircle, Shield, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EntityAvatar } from "@/components/shared/avatars";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { requireViewer } from "@/lib/auth/session";
import { humanize } from "@/lib/format";
import { noIndex } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My dashboards", robots: noIndex };

function Tile({ href, icon: Icon, title, body, tone, badge }: { href: string; icon: LucideIcon; title: string; body: string; tone: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="group pressable flex items-center gap-4 rounded-3xl border bg-gradient-to-br from-card to-tint p-4 shadow-xs transition-shadow hover:shadow-md">
      <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon aria-hidden className="size-7" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-bold text-heading">{title} {badge}</span>
        <span className="block text-sm text-muted-foreground">{body}</span>
      </span>
      <ArrowRight aria-hidden className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

export default async function DashboardsPage() {
  const viewer = await requireViewer("/dashboards");
  const supabase = await createClient();
  const [{ data: rider }, { count: rentals }, { data: apps }] = await Promise.all([
    supabase.from("rider_profiles").select("status, is_online").eq("user_id", viewer.id).maybeSingle(),
    supabase.from("rental_listings").select("id", { count: "exact", head: true }).eq("owner_id", viewer.id),
    supabase.from("entity_applications").select("id, proposed_name, status").eq("applicant_id", viewer.id).in("status", ["submitted", "under_review", "info_requested"]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My dashboards" description="Everything you manage on BridgeConnect, in one place." />

      <Section title="Businesses & organisations">
        <div className="stagger grid gap-3">
          {viewer.workspaces.map((w) => (
            <Link key={w.entityId} href={`/workspace/${w.entityId}`} className="group pressable flex items-center gap-4 rounded-3xl border bg-gradient-to-br from-card to-primary-soft/60 p-4 shadow-xs hover:shadow-md">
              <EntityAvatar name={w.name} path={w.logoPath} className="size-14 rounded-2xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-heading">{w.name}</span>
                <span className="block text-sm text-muted-foreground">{ENTITY_TYPE_LABEL[w.entityType]} · {humanize(w.role)}</span>
              </span>
              {w.status !== "active" ? <StatusBadge status={w.status} /> : <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Open dashboard</span>}
            </Link>
          ))}
          {(apps ?? []).map((a) => (
            <Tile key={a.id} href={`/apply/${a.id}`} icon={FileCheck2} title={a.proposed_name} body="Application in progress" tone="bg-warning-soft text-warning-soft-foreground" badge={<StatusBadge status={a.status} />} />
          ))}
          <Tile href="/apply/new" icon={PlusCircle} title="Register a business or organisation" body="Get verified and your own dashboard to manage products, services, orders and more." tone="bg-primary-soft text-primary-soft-foreground" />
        </div>
      </Section>

      <Section title="Rides & delivery">
        <Tile
          href="/rider"
          icon={Bike}
          title={rider ? "Rider dashboard" : "Become a rider or driver"}
          body={rider ? (rider.status === "approved" ? (rider.is_online ? "You're online and receiving jobs." : "You're offline. Go online to receive jobs.") : `Application ${humanize(rider.status)}.`) : "Okada, tricycle, taxi or dispatch — get verified and earn."}
          tone="bg-brand-green-soft text-brand-green-soft-foreground"
          badge={rider?.status === "approved" ? <span className={rider.is_online ? "size-2.5 rounded-full bg-brand-green" : "size-2.5 rounded-full bg-muted-foreground/50"}><span className="sr-only">{rider.is_online ? "Online" : "Offline"}</span></span> : null}
        />
      </Section>

      <Section title="Property">
        <Tile href="/rentals/mine" icon={House} title="My rentals" body={rentals ? `${rentals} listing${rentals === 1 ? "" : "s"} and viewing requests` : "List a room, house, shop or land for rent."} tone="bg-warning-soft text-warning-soft-foreground" />
      </Section>

      {viewer.isAdmin ? (
        <Section title="Staff">
          <Tile href="/admin" icon={Shield} title="Administration" body="Verification, moderation, riders, support and analytics." tone="bg-destructive-soft text-destructive-soft-foreground" />
        </Section>
      ) : null}
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Building2 aria-hidden className="size-3.5" /> Each dashboard opens with its own menu.</p>
    </div>
  );
}
