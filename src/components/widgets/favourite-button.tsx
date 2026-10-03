"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleFavouriteAction } from "@/features/favourites/actions";
import type { FavouriteKind } from "@/features/favourites/types";
import { cn } from "@/lib/utils";

export function FavouriteButton({
  kind,
  id,
  initial,
  signedIn,
  compact = false,
}: {
  kind: FavouriteKind;
  id: string;
  initial: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useOptimistic(initial);

  function toggle() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      setSaved(!saved);
      const result = await toggleFavouriteAction({ kind, id }, !saved);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favourites" : "Save to favourites"}
    >
      <Heart aria-hidden className={cn(saved && "fill-destructive text-destructive")} />
      {compact ? null : saved ? "Saved" : "Save"}
    </Button>
  );
}
