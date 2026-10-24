import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader, Section } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ModerationButtons } from "@/features/admin/components/moderation-buttons";
import { listModerationQueue } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatRelative, humanize } from "@/lib/format";

export default async function AdminModerationPage() {
  await requireAdminPermission("content.moderate");
  const { held, hidden, actions } = await listModerationQueue();
  const PostRow = ({ p }: { p: (typeof held)[number] }) => (
    <li className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge status={p.status} /> {p.profiles?.display_name} · {p.communities?.name} · {formatRelative(p.created_at)}
      </div>
      <Link href={`/community/posts/${p.id}`} className="block">
        {p.title ? <p className="font-semibold">{p.title}</p> : null}
        <p className="line-clamp-3 text-sm">{p.body}</p>
      </Link>
      {p.moderation_reason ? <p className="text-xs text-muted-foreground">Reason: {p.moderation_reason}</p> : null}
      <ModerationButtons targetType="post" targetId={p.id} status={p.status} />
    </li>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Moderation" description="Posts held for review, hidden content and recent decisions in your area." />
      <Section title={`Awaiting review (${held.length})`}>
        {held.length === 0 ? <EmptyState icon={ShieldCheck} title="Nothing waiting" /> : <ul className="space-y-3">{held.map((p) => <PostRow key={p.id} p={p} />)}</ul>}
      </Section>
      <Section title="Hidden or removed">
        {hidden.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : <ul className="space-y-3">{hidden.map((p) => <PostRow key={p.id} p={p} />)}</ul>}
      </Section>
      <Section title="Recent decisions">
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {actions.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3">
              <span><strong>{humanize(a.action)}</strong> {a.target_type ? humanize(a.target_type).toLowerCase() : "report"} — {a.reason}</span>
              <span className="text-muted-foreground">{a.profiles?.display_name} · {formatRelative(a.created_at)}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
