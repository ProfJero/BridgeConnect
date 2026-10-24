import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SeverityBadge, StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getAlert } from "@/features/emergency/queries";
import { isUuid } from "@/lib/auth/session";
import { formatDateTime, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Emergency alert" };

export default async function AlertPage({ params }: PageProps<"/emergency/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const alert = await getAlert(id);
  if (!alert) notFound();
  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Button asChild variant="ghost" size="sm"><Link href="/emergency"><ArrowLeft aria-hidden /> Emergency</Link></Button>
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
        <span className="text-sm text-muted-foreground">{humanize(alert.category)}</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{alert.title}</h1>
      <p className="text-sm text-muted-foreground">
        Issued {formatDateTime(alert.starts_at)}{alert.expires_at ? ` · Expires ${formatDateTime(alert.expires_at)}` : ""}
      </p>
      <p className="leading-relaxed whitespace-pre-line">{alert.body}</p>
      {alert.instructions ? (
        <Alert variant="warning">
          <AlertTitle>What to do</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{alert.instructions}</AlertDescription>
        </Alert>
      ) : null}
      <Button asChild variant="destructive"><a href="tel:112">Call 112</a></Button>
    </article>
  );
}
