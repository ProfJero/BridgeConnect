"use client";

import { usePathname } from "next/navigation";

import { DashboardGroupLabel, DashboardLink } from "@/components/dashboard/dashboard-frame";

import { WORKSPACE_MODULES } from "../modules";

const GROUPS: { label: string; segments: string[] }[] = [
  { label: "Overview", segments: ["", "inbox"] },
  { label: "Sell & serve", segments: ["products", "orders", "services", "bookings"] },
  { label: "Reach", segments: ["posts", "events", "jobs", "ads", "alerts", "media"] },
  { label: "Reputation", segments: ["reviews", "analytics"] },
  { label: "Organisation", segments: ["profile", "members", "settings", "support"] },
];

export function WorkspaceNav({
  entityId,
  segments,
  badges = {},
}: {
  entityId: string;
  segments: string[];
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const base = `/workspace/${entityId}`;
  return (
    <nav aria-label="Workspace" className="space-y-1">
      {GROUPS.map((g) => {
        const modules = WORKSPACE_MODULES.filter((m) => g.segments.includes(m.segment) && segments.includes(m.segment));
        if (!modules.length) return null;
        return (
          <div key={g.label}>
            <DashboardGroupLabel>{g.label}</DashboardGroupLabel>
            <ul className="space-y-0.5">
              {modules.map(({ segment, label, icon }) => {
                const href = segment ? `${base}/${segment}` : base;
                const active = segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
                return (
                  <li key={segment || "dashboard"}>
                    <DashboardLink href={href} label={label} icon={icon} active={active} badge={badges[segment]} />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
