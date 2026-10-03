import { BadgeCheck, Building2, FileCheck2, Search, Store } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listMyApplications } from "@/features/applications/queries";
import { ENTITY_TYPE_LABEL } from "@/features/directory/constants";
import { requireViewer } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Register your organisation" };

const STEPS = [
  { icon: FileCheck2, title: "Apply", text: "Tell us about your business or organisation." },
  { icon: Search, title: "Review", text: "A DBI verification officer reviews your details." },
  { icon: BadgeCheck, title: "Verification", text: "Upload documents so we can confirm who you are." },
  { icon: Store, title: "Workspace", text: "Once approved, you get a verified listing and workspace." },
];

export default async function ApplyPage() {
  const viewer = await requireViewer("/apply");
  const applications = await listMyApplications(viewer.id);
  const open = applications.filter((a) => ["submitted", "under_review", "info_requested"].includes(a.status)).length;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Register your business or organisation"
        description="Only verified organisations appear in the BridgeConnect directory. This keeps the platform trustworthy for everyone."
        actions={open < 3 && viewer.isActive ? <Button asChild><Link href="/apply/new"><Building2 aria-hidden /> Start application</Link></Button> : null}
      />
      <ol className="grid gap-3 sm:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-xl border bg-card p-4">
            <Icon aria-hidden className="size-5 text-primary" />
            <p className="mt-2 font-semibold">{i + 1}. {title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <Section title="Your applications">
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven&apos;t applied yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {applications.map((a) => (
              <li key={a.id}>
                <Link href={a.status === "approved" && a.entity_id ? `/workspace/${a.entity_id}` : `/apply/${a.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                  <span>
                    <span className="block font-semibold">{a.proposed_name}</span>
                    <span className="block text-sm text-muted-foreground">{ENTITY_TYPE_LABEL[a.entity_type]} · Submitted {formatDate(a.submitted_at)}</span>
                  </span>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {open >= 3 ? <p className="text-sm text-muted-foreground">You can have up to 3 applications in progress at a time.</p> : null}
      </Section>
    </div>
  );
}
