"use client";

import { ArrowLeft, ChevronsLeft, ChevronsRight, LayoutDashboard, LifeBuoy, PenSquare, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

import { isActivePath, MOBILE_TABS, PRIMARY_NAV } from "./nav-config";

export const RAIL_COOKIE = "bc-rail";

/** Top-level destinations: no back button there. */
const ROOTS = new Set(["/", ...PRIMARY_NAV.map((n) => n.href), ...MOBILE_TABS.map((n) => n.href), "/messages", "/notifications"]);

export function isRootPath(pathname: string) {
  return ROOTS.has(pathname);
}

/**
 * Back button for pages reached from inside another page (product, profile,
 * settings…). Uses history when the user came from inside the app, otherwise
 * goes up one level so it never leaves BridgeConnect.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  if (isRootPath(pathname)) return null;
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        const sameOrigin = document.referrer && new URL(document.referrer).origin === window.location.origin;
        if (sameOrigin && window.history.length > 1) router.back();
        else router.push(pathname.split("/").slice(0, -1).join("/") || "/");
      }}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-accent active:scale-90",
        className,
      )}
    >
      <ArrowLeft aria-hidden className="size-5" />
    </button>
  );
}

/** Desktop sidebar in the theme's deep colour, collapsible to an icon rail. */
export function DesktopRail({ signedIn, initialCollapsed, dashboards }: { signedIn: boolean; initialCollapsed: boolean; dashboards: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${RAIL_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };
  const item = (href: string, label: string, Icon: typeof Settings, active: boolean, key?: string) => (
    <Link
      key={key ?? href}
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-nav-muted transition-all duration-200 hover:bg-nav-active hover:text-nav-fg",
        active && "bg-nav-active font-semibold text-nav-fg shadow-inner",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-brand-green" /> : null}
      <Icon aria-hidden className="size-5 shrink-0 transition-transform group-hover:scale-110" strokeWidth={active ? 2.4 : 2} />
      <span className={cn("truncate transition-opacity", collapsed && "sr-only")}>{label}</span>
    </Link>
  );
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-gradient-to-b from-nav-1 to-nav-2 text-nav-fg shadow-xl transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <Link href="/" aria-label="BridgeConnect home" className={cn("flex h-16 shrink-0 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <span className="rounded-xl bg-white p-1 shadow-sm"><LogoMark className="size-8" /></span>
        {!collapsed ? (
          <span className="text-lg font-extrabold tracking-tight">Bridge<span className="text-nav-muted">Connect</span></span>
        ) : null}
      </Link>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map(({ href, label, icon }) => item(href, label, icon, isActivePath(pathname, href)))}
        {dashboards ? (
          <>
            <div className="my-2 border-t border-white/15" />
            {item("/dashboards", "My dashboards", LayoutDashboard, isActivePath(pathname, "/dashboards"))}
          </>
        ) : null}
        <div className="my-2 border-t border-white/15" />
        {signedIn ? item("/settings", "Settings", Settings, isActivePath(pathname, "/settings")) : null}
        {signedIn ? item("/support", "Help & support", LifeBuoy, isActivePath(pathname, "/support")) : null}
      </nav>
      <div className="space-y-2 p-3">
        <Link
          href="/community/new"
          title={collapsed ? "Create a post" : undefined}
          className={cn(
            "pressable flex items-center justify-center gap-2 rounded-full bg-brand-green py-3 text-sm font-semibold text-brand-green-foreground shadow-lg hover:brightness-110",
            collapsed && "px-0",
          )}
        >
          <PenSquare aria-hidden className="size-5" /> {collapsed ? <span className="sr-only">Create a post</span> : "Create a post"}
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm text-nav-muted transition hover:bg-nav-active hover:text-nav-fg"
        >
          {collapsed ? <ChevronsRight aria-hidden className="size-5" /> : <><ChevronsLeft aria-hidden className="size-5" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}

/** Phone: a floating, rounded five-tab bar with a sliding highlight. */
export function MobileTabBar() {
  const pathname = usePathname();
  const activeHref = MOBILE_TABS.filter((t) => isActivePath(pathname, t.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const index = MOBILE_TABS.findIndex((t) => t.href === activeHref);
  return (
    <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <ul className="pointer-events-auto relative mx-auto grid max-w-md grid-cols-5 rounded-[1.75rem] bg-gradient-to-r from-nav-1 to-nav-2 p-1.5 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)]">
        <span
          aria-hidden
          className={cn(
            "absolute top-1.5 bottom-1.5 left-1.5 rounded-[1.35rem] bg-white/95 shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
            index < 0 && "opacity-0",
          )}
          style={{ width: "calc((100% - 0.75rem) / 5)", transform: `translateX(${Math.max(index, 0) * 100}%)` }}
        />
        {MOBILE_TABS.map((item, i) => {
          const active = i === index;
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-[1.35rem] py-1.5 text-[10.5px] font-semibold text-nav-muted transition-colors duration-300 active:scale-95",
                  active && "text-nav-1",
                )}
              >
                <Icon aria-hidden className={cn("size-[22px] transition-transform duration-300", active && "-translate-y-0.5 scale-110")} strokeWidth={active ? 2.4 : 1.9} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
