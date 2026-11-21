"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { WORKSPACE_MODULES } from "../modules";

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
  const modules = WORKSPACE_MODULES.filter((m) => segments.includes(m.segment));
  return (
    <nav aria-label="Workspace">
      <ul className="no-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {modules.map(({ segment, label, icon: Icon }) => {
          const href = segment ? `${base}/${segment}` : base;
          const active = segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
          return (
            <li key={segment || "dashboard"} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-sidebar-foreground/80 hover:bg-accent hover:text-foreground",
                  active && "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
                {badges[segment] ? (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 text-[11px] leading-5 font-bold text-destructive-foreground">
                    {badges[segment]! > 99 ? "99+" : badges[segment]}
                    <span className="sr-only"> new</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
