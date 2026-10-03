"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import type { AdminNavGroup } from "../nav";
import { ADMIN_NAV } from "../nav";

export function AdminNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();
  const groups: AdminNavGroup[] = ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((i) => allowed.includes(i.href)) })).filter((g) => g.items.length);
  return (
    <nav aria-label="Administration" className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-accent hover:text-foreground", active && "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft")}
                  >
                    <Icon aria-hidden className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
