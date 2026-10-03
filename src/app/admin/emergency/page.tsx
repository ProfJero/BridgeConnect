import { Siren } from "lucide-react";
import Link from "next/link";

import { PageHeader, Section } from "@/components/shared/page-header";
import { SeverityBadge, StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseAlertButtons, ContactForm, ContactToggle } from "@/features/admin/components/admin-forms";
import { getLocationTree, listAdminAlerts } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDateTime, humanize } from "@/lib/format";

export default async function AdminEmergencyPage() {
  await requireAdminPermission("emergency.publish");
  const [{ alerts, contacts }, locations] = await Promise.all([listAdminAlerts(), getLocationTree()]);
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Emergency" description="Issue alerts and maintain emergency contacts for the areas you cover." actions={<Button asChild variant="destructive"><Link href="/admin/emergency/new"><Siren aria-hidden /> Issue alert</Link></Button>} />
      <Section title="Alerts">
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={a.severity} /><StatusBadge status={a.status} /><span className="text-xs text-muted-foreground">{a.communities?.name ?? a.districts?.name ?? a.regions?.name} · {formatDateTime(a.starts_at)}</span></div>
                <Link href={`/emergency/${a.id}`} className="font-semibold hover:underline">{a.title}</Link>
              </div>
              {a.status === "active" ? <CloseAlertButtons alertId={a.id} /> : null}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Emergency contacts">
        <ul className="divide-y rounded-xl border bg-card">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <span><strong>{c.name}</strong> · {humanize(c.service)} · {c.phone} <span className="text-muted-foreground">({c.communities?.name ?? c.districts?.name ?? c.regions?.name ?? "National"})</span>{c.is_active ? "" : " · hidden"}</span>
              <ContactToggle id={c.id} isActive={c.is_active} />
            </li>
          ))}
        </ul>
        <Card>
          <CardHeader><CardTitle className="text-base">Add a contact</CardTitle></CardHeader>
          <CardContent><ContactForm locations={locations} /></CardContent>
        </Card>
      </Section>
    </div>
  );
}
