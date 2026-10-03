"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { WORKSPACE_MODULES } from "../modules";

export function WorkspaceNav({ entityId, segments }: { entityId: string; segments: string[] }) {
  const pathname = usePathname();
  const base = `/workspace/${entityId}`;
  const modules = WORKSPACE_MODULES.filter((m) => segments.includes(m.segment));
  return (
    <nav aria-label="Workspace">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
