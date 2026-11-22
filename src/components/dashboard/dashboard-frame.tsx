"use client";

import { ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DrawerPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const CollapsedContext = React.createContext(false);
/** Whether the desktop sidebar is collapsed to icons (drawer is never collapsed). */
export function useSidebarCollapsed() {
  return React.useContext(CollapsedContext);
}

/**
 * Dashboard chrome shared by Administration, workspaces and the rider app:
 * - desktop: sticky sidebar in the theme's deep colour, collapsible to an icon rail (remembered in a cookie);
 * - phones: a compact top bar with a menu button that slides the same sidebar in as a drawer.
 */
export function DashboardFrame({
  brand,
  title,
  footer,
  nav,
  cookieName,
  initialCollapsed,
  topRight,
  children,
}: {
  brand: React.ReactNode;
  title: React.ReactNode;
  footer?: React.ReactNode;
  nav: React.ReactNode;
  cookieName: string;
  initialCollapsed: boolean;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [open, setOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);
  // Close the drawer after navigating (adjusting state during render, per React docs).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${cookieName}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  };

  const panel = (isDrawer: boolean) => (
    <CollapsedContext.Provider value={!isDrawer && collapsed}>
      <div className="flex h-full flex-col text-nav-fg">
        <div className={cn("shrink-0 px-3 pt-4 pb-3", !isDrawer && collapsed && "px-2")}>{brand}</div>
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-3">{nav}</div>
        {footer ? <div className={cn("shrink-0 border-t border-white/10 p-3", !isDrawer && collapsed && "hidden")}>{footer}</div> : null}
        {!isDrawer ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className="m-3 mt-0 flex items-center justify-center gap-2 rounded-xl py-2 text-sm text-nav-muted transition hover:bg-nav-active hover:text-nav-fg"
          >
            {collapsed ? <ChevronsRight aria-hidden className="size-5" /> : <><ChevronsLeft aria-hidden className="size-5" /> Collapse</>}
          </button>
        ) : null}
      </div>
    </CollapsedContext.Provider>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 bg-gradient-to-b from-nav-1 to-nav-2 shadow-xl transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[76px]" : "w-72",
        )}
      >
        {panel(false)}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/90 px-3 pt-safe backdrop-blur-md lg:h-16 lg:px-6">
          <DrawerPrimitive.Root open={open} onOpenChange={setOpen}>
            <DrawerPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex size-10 items-center justify-center rounded-xl text-foreground transition hover:bg-accent active:scale-90 lg:hidden"
              >
                <Menu aria-hidden className="size-6" />
              </button>
            </DrawerPrimitive.Trigger>
            <DrawerPrimitive.Portal>
              <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
              <DrawerPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-xs rounded-r-3xl bg-gradient-to-b from-nav-1 to-nav-2 shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=open]:duration-300 lg:hidden">
                <DrawerPrimitive.Title className="sr-only">Menu</DrawerPrimitive.Title>
                <DrawerPrimitive.Description className="sr-only">Dashboard navigation</DrawerPrimitive.Description>
                <DrawerPrimitive.Close className="absolute top-5 -right-12 z-10 flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-lg transition active:scale-90" aria-label="Close menu">
                  <X aria-hidden className="size-5" />
                </DrawerPrimitive.Close>
                {panel(true)}
              </DrawerPrimitive.Content>
            </DrawerPrimitive.Portal>
          </DrawerPrimitive.Root>
          <div className="min-w-0 flex-1 truncate font-semibold text-heading">{title}</div>
          {topRight}
        </header>
        <main id="main" className="animate-page mx-auto w-full max-w-7xl min-w-0 flex-1 space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/** One sidebar link (respects the collapsed rail). */
export function DashboardLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
}) {
  const collapsed = useSidebarCollapsed();
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium text-nav-muted transition-all duration-200 hover:bg-nav-active hover:text-nav-fg",
        active && "bg-nav-active font-semibold text-nav-fg",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? <span aria-hidden className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-brand-green" /> : null}
      <Icon aria-hidden className="size-5 shrink-0 transition-transform group-hover:scale-110" strokeWidth={active ? 2.4 : 2} />
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{label}</span>
      {badge ? (
        <span className={cn("rounded-full bg-destructive px-1.5 text-[11px] leading-5 font-bold text-destructive-foreground", collapsed && "absolute top-1 right-1 px-1 text-[9px] leading-4")}>
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> new</span>
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardGroupLabel({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarCollapsed();
  if (collapsed) return <div aria-hidden className="mx-2 my-2 border-t border-white/10" />;
  return <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-nav-muted/80 uppercase">{children}</p>;
}
