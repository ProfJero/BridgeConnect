import { Siren } from "lucide-react";
import Link from "next/link";

import { getActiveAlerts, getAlertsForCommunity } from "@/features/emergency/queries";

/** Shows the most severe active warning/critical alert relevant to the viewer. */
export async function EmergencyBanner({ communityId }: { communityId: string | null }) {
  let alerts;
  try {
    alerts = communityId ? await getAlertsForCommunity(communityId) : await getActiveAlerts(5);
  } catch {
    return null; // Never block the page on the banner.
  }
  const top = alerts.find((a) => a.severity === "critical" || a.severity === "warning");
  if (!top) return null;
  const critical = top.severity === "critical";
  return (
    <div
      role="alert"
      className={critical ? "bg-destructive text-destructive-foreground" : "bg-warning-soft text-warning-soft-foreground"}
    >
      <Link
        href={`/emergency/${top.id}`}
        className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-medium hover:underline"
      >
        <Siren aria-hidden className="size-4 shrink-0" />
        <span className="font-bold uppercase">{critical ? "Critical alert" : "Warning"}:</span>
        <span className="truncate">{top.title}</span>
      </Link>
    </div>
  );
}
