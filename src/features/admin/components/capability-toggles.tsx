"use client";

import { Switch } from "@/components/ui/switch";
import { useServerAction } from "@/hooks/use-server-action";
import { humanize } from "@/lib/format";

import { setEntityCapabilityAction } from "../actions";

export function CapabilityToggles({ entityId, rows, canManage }: { entityId: string; rows: { capability: string; enabled: boolean; isDefault: boolean; overridden: boolean }[]; canManage: boolean }) {
  const { pending, run } = useServerAction();
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map((r) => (
        <li key={r.capability} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
          <label htmlFor={`cap-${r.capability}`} className="text-sm">
            <span className="font-medium">{humanize(r.capability)}</span>
            <span className="block text-xs text-muted-foreground">{r.overridden ? "Overridden by admin" : r.isDefault ? "Default for this type" : "Not included by default"}</span>
          </label>
          <Switch id={`cap-${r.capability}`} checked={r.enabled} disabled={!canManage || pending} onCheckedChange={(v) => run(() => setEntityCapabilityAction({ entityId, capability: r.capability, enabled: v }))} />
        </li>
      ))}
    </ul>
  );
}
