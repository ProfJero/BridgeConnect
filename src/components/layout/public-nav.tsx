"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActivePath, MOBILE_TABS, PRIMARY_NAV } from "./nav-config";

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {PRIMARY_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-primary-soft text-primary-soft-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  // Avoid highlighting "Community" while on the create-post screen.
  const activeHref =
    MOBILE_TABS.filter((t) => isActivePath(pathname, t.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          const isCreate = item.href === "/community/new";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full",
                    isCreate && "size-9 -mt-1 bg-primary text-primary-foreground shadow-md",
                  )}
                >
                  <Icon aria-hidden className={cn("size-5", isCreate && "size-5")} strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
