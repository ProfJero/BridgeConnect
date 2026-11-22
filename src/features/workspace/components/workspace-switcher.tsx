"use client";

import { Check, ChevronsUpDown, Home } from "lucide-react";
import Link from "next/link";

import { useSidebarCollapsed } from "@/components/dashboard/dashboard-frame";
import { EntityAvatar } from "@/components/shared/avatars";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Ws = { entityId: string; name: string; logoPath: string | null };

/** Context switcher between the user's workspaces and the public platform. */
export function WorkspaceSwitcher({ current, workspaces }: { current: Ws; workspaces: Ws[] }) {
  const collapsed = useSidebarCollapsed();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn("h-auto w-full justify-between gap-2 rounded-2xl bg-white/10 px-2 py-2 text-nav-fg hover:bg-white/20 hover:text-nav-fg", collapsed && "justify-center bg-transparent px-0")}>
          <span className="flex min-w-0 items-center gap-2.5">
            <EntityAvatar name={current.name} path={current.logoPath} className="size-10 rounded-xl border border-white/30" />
            <span className={cn("min-w-0 text-left", collapsed && "sr-only")}>
              <span className="block truncate text-sm font-bold">{current.name}</span>
              <span className="block text-[11px] font-normal text-nav-muted">Business dashboard</span>
            </span>
          </span>
          <ChevronsUpDown aria-hidden className={cn("size-4 text-nav-muted", collapsed && "hidden")} />
          <span className="sr-only">Switch workspace</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.entityId} asChild>
            <Link href={`/workspace/${w.entityId}`}>
              <EntityAvatar name={w.name} path={w.logoPath} className="size-6" />
              <span className="flex-1 truncate">{w.name}</span>
              {w.entityId === current.entityId ? <Check aria-hidden /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/"><Home aria-hidden /> Back to BridgeConnect</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
