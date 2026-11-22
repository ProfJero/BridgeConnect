"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toggleReactionAction } from "../actions";

export function ReactionButton({
  postId,
  count,
  reacted,
  signedIn,
}: {
  postId: string;
  count: number;
  reacted: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic({ count, reacted });

  function toggle() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const next = !state.reacted;
      setState({ reacted: next, count: state.count + (next ? 1 : -1) });
      const result = await toggleReactionAction(postId, next);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={state.reacted}
      aria-label={state.reacted ? `Unlike (${state.count} likes)` : `Like (${state.count} likes)`}
      className={cn(state.reacted && "text-destructive")}
    >
      <Heart aria-hidden className={cn("transition-transform duration-200", state.reacted && "scale-110 fill-current")} />
      {state.count > 0 ? state.count : "Like"}
    </Button>
  );
}
