import { LifeBuoy, PlusCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { listMyTickets } from "@/features/support/queries";
import { TICKET_CATEGORY_LABEL } from "@/features/support/schemas";
import { requireViewer } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Help & support", robots: noIndex };

const FAQ = [
  {
    q: "How do I get my business or organisation listed?",
    a: "Go to Register an organisation, fill in the application and upload your registration documents. A DBI verification officer for your district reviews it; once approved you get your own workspace dashboard.",
  },
  {
    q: "How do I pay for orders?",
    a: "BridgeConnect connects you with the seller — you agree payment (cash, mobile money) directly with them. Never send money to someone you haven't verified, and never share your mobile-money PIN.",
  },
  {
    q: "Someone is harassing me or posting scams.",
    a: "Use the Report button on the post, review, listing or profile. Moderators in your district are alerted. For urgent danger call 112.",
  },
  {
    q: "How do I delete my account or download my data?",
    a: "Open Settings from your profile. You can download a copy of your data or permanently delete your account there.",
  },
];

export default async function SupportPage() {
  const viewer = await requireViewer("/support");
  const tickets = await listMyTickets(viewer.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Help & support"
        description="Answers to common questions, and a direct line to the Digital Bridge Initiative team."
        actions={<Button asChild><Link href="/support/new"><PlusCircle aria-hidden /> Contact support</Link></Button>}
      />
      <Section title="Frequently asked">
        <div className="divide-y rounded-xl border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none font-medium after:float-right after:content-['+'] group-open:after:content-['–']">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
      <Section title="My tickets">
        {tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No tickets" description="If something isn't working, we're here to help." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/support/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">#{t.ticket_number} · {t.subject}</span>
                    <span className="block text-xs text-muted-foreground">{TICKET_CATEGORY_LABEL[t.category]} · updated {formatRelative(t.last_activity_at)}</span>
                  </span>
                  <StatusBadge status={t.status} label={t.status === "pending" ? "Awaiting your reply" : undefined} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
