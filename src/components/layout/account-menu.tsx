"use client";

import {
  Bookmark,
  Building2,
  ClipboardList,
  FileCheck2,
  LogOut,
  Package,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/shared/avatars";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

export type AccountMenuProps = {
  displayName: string;
  avatarPath: string | null;
  isAdmin: boolean;
  workspaces: { entityId: string; name: string }[];
};

export function AccountMenu({ displayName, avatarPath, isAdmin, workspaces }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <UserAvatar name={displayName} path={avatarPath} className="size-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate text-sm text-foreground">{displayName}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/profile"><User aria-hidden /> My profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favourites"><Bookmark aria-hidden /> Favourites</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders"><Package aria-hidden /> My orders</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/jobs/applications"><ClipboardList aria-hidden /> Job applications</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/apply"><FileCheck2 aria-hidden /> Register a business or organisation</Link>
        </DropdownMenuItem>
        {workspaces.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.entityId} asChild>
                <Link href={`/workspace/${w.entityId}`}>
                  <Building2 aria-hidden /> <span className="truncate">{w.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin"><Shield aria-hidden /> DBI Administration</Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
