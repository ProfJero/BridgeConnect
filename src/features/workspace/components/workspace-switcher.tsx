"use client";

import { Check, ChevronsUpDown, Home } from "lucide-react";
import Link from "next/link";

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

type Ws = { entityId: string; name: string; logoPath: string | null };

/** Context switcher between the user's workspaces and the public platform. */
export function WorkspaceSwitcher({ current, workspaces }: { current: Ws; workspaces: Ws[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between gap-2 px-2 py-1.5">
          <span className="flex min-w-0 items-center gap-2">
            <EntityAvatar name={current.name} path={current.logoPath} className="size-8" />
            <span className="truncate text-sm font-semibold">{current.name}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 text-muted-foreground" />
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
