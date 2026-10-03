import { Phone, ShieldCheck, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { SeverityBadge, StatusBadge } from "@/components/shared/status-badge";
import { CommunityFilter } from "@/components/widgets/community-filter";
import { getActiveAlerts, getAlertsForCommunity, getEmergencyContacts } from "@/features/emergency/queries";
import { getCommunityOptions, resolveCommunity } from "@/features/locations/queries";
import { getViewer } from "@/lib/auth/session";
import { formatRelative, humanize } from "@/lib/format";
import { uuidParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Emergency" };

export default async function EmergencyPage({ searchParams }: PageProps<"/emergency">) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const communityId = uuidParam(sp.community) ?? (sp.community === undefined ? viewer?.profile.home_community_id ?? undefined : undefined);
  const [target, communities] = await Promise.all([resolveCommunity(communityId), getCommunityOptions()]);
  const [alerts, contacts] = await Promise.all([
    communityId ? getAlertsForCommunity(communityId, true) : getActiveAlerts(),
    getEmergencyContacts(target),
  ]);
  const active = alerts.filter((a) => a.status === "active" && (!a.expires_at || new Date(a.expires_at) > new Date()));
  const recent = alerts.filter((a) => !active.includes(a)).slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Emergency"
        description="Official alerts and emergency contacts. In immediate danger, call 112."
        actions={<CommunityFilter options={communities} value={communityId} />}
      />
      <a href="tel:112" className="flex items-center justify-between gap-3 rounded-2xl bg-destructive p-5 text-destructive-foreground shadow-sm">
        <span>
          <span className="block text-sm font-medium opacity-90">National emergency number</span>
          <span className="block text-3xl font-bold">112</span>
        </span>
        <Phone aria-hidden className="size-8" />
      </a>

      <Section title="Active alerts">
        {active.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No active alerts" description={communityId ? "There are no active alerts for this area." : "Choose your community to see local alerts."} />
        ) : (
          <ul className="space-y-3">
            {active.map((a) => (
              <li key={a.id}>
                <Link href={`/emergency/${a.id}`} className="flex gap-3 rounded-xl border bg-card p-4 hover:shadow-md">
                  <Siren aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={a.severity} /><span className="text-xs text-muted-foreground">{humanize(a.category)} · {formatRelative(a.starts_at)}</span></div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Emergency contacts">
        <ul className="grid gap-2 sm:grid-cols-2">
          {contacts.map((c) => (
            <li key={c.id}>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:shadow-md">
                <span>
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-sm text-muted-foreground">{humanize(c.service)}{c.notes ? ` · ${c.notes}` : ""}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-primary"><Phone aria-hidden className="size-4" /> {c.phone}</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {recent.length ? (
        <Section title="Recent alerts">
          <ul className="divide-y rounded-xl border bg-card">
            {recent.map((a) => (
              <li key={a.id}>
                <Link href={`/emergency/${a.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                  <span className="font-medium">{a.title}</span>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
