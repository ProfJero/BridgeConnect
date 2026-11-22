"use client";

import { usePathname } from "next/navigation";

import { DashboardGroupLabel, DashboardLink } from "@/components/dashboard/dashboard-frame";

import type { AdminNavGroup } from "../nav";
import { ADMIN_NAV } from "../nav";

export function AdminNav({ allowed, badges = {} }: { allowed: string[]; badges?: Record<string, number> }) {
  const pathname = usePathname();
  const groups: AdminNavGroup[] = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => allowed.includes(i.href)) })).filter((g) => g.items.length);
  return (
    <nav aria-label="Administration" className="space-y-1">
      {groups.map((group) => (
        <div key={group.label}>
          <DashboardGroupLabel>{group.label}</DashboardGroupLabel>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <DashboardLink href={href} label={label} icon={icon} active={active} badge={badges[href]} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
