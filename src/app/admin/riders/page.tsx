import { Bike } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { RiderReviewButtons } from "@/features/mobility/components/rider-review";
import { adminListRiders } from "@/features/mobility/queries";
import { requireAdminPermission } from "@/lib/auth/session";
import { VEHICLE_LABEL } from "@/lib/fares";
import { formatDate } from "@/lib/format";
import { enumParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

const STATUSES = ["pending", "approved", "suspended", "rejected"] as const;

export default async function AdminRidersPage({ searchParams }: PageProps<"/admin/riders">) {
  await requireAdminPermission("mobility.manage");
  const sp = await searchParams;
  const status = enumParam(sp.status, STATUSES) ?? "pending";
  const riders = await adminListRiders(status);
  return (
    <div className="space-y-5">
      <PageHeader title="Riders & drivers" description="Verify okada, tricycle, taxi and dispatch riders in your area before they can accept trips." />
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/riders?status=${s}`} aria-current={status === s ? "page" : undefined}
            className={cn("rounded-full border px-3 py-1 text-sm font-medium capitalize", status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {s}
          </Link>
        ))}
      </div>
      {riders.length === 0 ? (
        <EmptyState icon={Bike} title="Nothing here" description={status === "pending" ? "No riders are waiting for verification." : "No riders in this list."} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {riders.map((r) => (
            <li key={r.user_id} className="flex flex-wrap items-center gap-3 p-4">
              <UserAvatar name={r.profiles?.display_name ?? "Rider"} path={r.profiles?.avatar_path} className="size-11" />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-semibold">
                  <Link href={`/admin/users/${r.user_id}`} className="hover:underline">{r.profiles?.display_name ?? "Rider"}</Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  {VEHICLE_LABEL[r.vehicle_type].name} ({VEHICLE_LABEL[r.vehicle_type].local}) · {r.vehicle_description}{r.plate_number ? ` · ${r.plate_number}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[r.offers_rides ? "Rides" : null, r.offers_delivery ? "Deliveries" : null].filter(Boolean).join(" & ")} · {r.communities?.name} · {r.phone} · applied {formatDate(r.created_at)}
                  {r.completed_trips ? ` · ${r.completed_trips} trips` : ""}
                </p>
                {r.status_reason ? <p className="text-xs text-destructive">{r.status_reason}</p> : null}
              </div>
              <StatusBadge status={r.status === "pending" ? "pending_review" : r.status} />
              <RiderReviewButtons riderId={r.user_id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
