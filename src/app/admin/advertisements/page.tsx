import { Megaphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { AdReviewButtons } from "@/features/admin/components/ad-review-buttons";
import { listAdminAds } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { formatDate, humanize } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { publicMediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const STATUSES = ["pending_review", "approved", "rejected", "paused", "archived"] as const;

export default async function AdminAdsPage({ searchParams }: PageProps<"/admin/advertisements">) {
  await requireAdminPermission("ads.review");
  const status = enumParam((await searchParams).status, STATUSES);
  const ads = await listAdminAds(status);
  return (
    <div className="space-y-5">
      <PageHeader title="Advertisements" description="Ads only run after review. Check that content is truthful, appropriate and links within BridgeConnect." />
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => <Link key={s} href={`/admin/advertisements?status=${s}`} className={cn("rounded-full border px-3 py-1 text-sm font-medium", (status ?? "pending_review") === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{humanize(s)}</Link>)}
      </div>
      {ads.length === 0 ? (
        <EmptyState icon={Megaphone} title="No advertisements here" />
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => (
            <li key={ad.id} className="flex flex-wrap items-start gap-4 rounded-xl border bg-card p-4">
              {ad.image_path ? <div className="relative size-20 overflow-hidden rounded-lg bg-muted"><Image src={publicMediaUrl(ad.image_path)!} alt="" fill sizes="80px" className="object-cover" /></div> : null}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={ad.status} /><span className="text-xs text-muted-foreground">{humanize(ad.placement)} · {formatDate(ad.starts_on)} – {formatDate(ad.ends_on)}</span></div>
                <p className="font-semibold">{ad.title}</p>
                {ad.body ? <p className="text-sm text-muted-foreground">{ad.body}</p> : null}
                <p className="text-xs text-muted-foreground">By {ad.entities?.name} · links to <code>{ad.link_path ?? "—"}</code></p>
              </div>
              {ad.status === "pending_review" ? <AdReviewButtons adId={ad.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
