import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TicketForm } from "@/features/support/components/ticket-form";
import { TICKET_CATEGORIES } from "@/features/support/schemas";
import { requireViewer } from "@/lib/auth/session";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Contact support", robots: noIndex };

export default async function NewTicketPage({ searchParams }: PageProps<"/support/new">) {
  const viewer = await requireViewer("/support/new");
  const sp = await searchParams;
  const category = (TICKET_CATEGORIES as readonly string[]).includes(String(sp.topic))
    ? (sp.topic as (typeof TICKET_CATEGORIES)[number])
    : undefined;
  const entity = typeof sp.entity === "string" && viewer.workspaces.some((w) => w.entityId === sp.entity) ? sp.entity : undefined;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Contact DBI support" description="We usually reply within one working day." />
      <Card>
        <CardContent className="pt-6">
          <TicketForm
            workspaces={viewer.workspaces.map((w) => ({ entityId: w.entityId, name: w.name }))}
            defaultCategory={category}
            defaultEntityId={entity}
          />
        </CardContent>
      </Card>
    </div>
  );
}
