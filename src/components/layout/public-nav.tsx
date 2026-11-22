"use client";

import { LifeBuoy, PlusCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActivePath, MOBILE_TABS, PRIMARY_NAV } from "./nav-config";

/** Desktop: a left rail like modern web apps (no top-heavy header, no footer). */
export function DesktopRail({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "pressable flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              active && "bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft",
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
      <div className="my-2 border-t" />
      {signedIn ? (
        <>
          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <Settings aria-hidden className="size-4" /> Settings
          </Link>
          <Link href="/support" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
            <LifeBuoy aria-hidden className="size-4" /> Help & support
          </Link>
        </>
      ) : null}
      <Link
        href="/community/new"
        className="pressable mt-3 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
      >
        <PlusCircle aria-hidden className="size-5" /> Create a post
      </Link>
    </nav>
  );
}

/** Phone: the five-tab bar from the approved design. */
export function MobileTabBar() {
  const pathname = usePathname();
  const activeHref = MOBILE_TABS.filter((t) => isActivePath(pathname, t.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]?.href;
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-safe shadow-[0_-4px_20px_-8px_rgb(0_0_0/0.12)] backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_TABS.map((item) => {
          const active = item.href === activeHref;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-primary",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-all duration-300",
                    active ? "opacity-100" : "w-0 opacity-0",
                  )}
                />
                <Icon aria-hidden className={cn("size-6 transition-transform duration-200", active && "-translate-y-px")} strokeWidth={active ? 2.3 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
