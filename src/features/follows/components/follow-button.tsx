"use client";

import { BellPlus, BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleFollowAction } from "../actions";

export function FollowButton({
  entityId,
  following,
  followers,
  signedIn,
}: {
  entityId: string;
  following: boolean;
  followers: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useOptimistic({ following, followers });

  function toggle() {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const next = !state.following;
      setState({ following: next, followers: state.followers + (next ? 1 : -1) });
      const result = await toggleFollowAction(entityId, next);
      if (result.ok) {
        if (result.message) toast.success(result.message);
      } else toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <Button variant={state.following ? "soft" : "default"} aria-pressed={state.following} onClick={toggle}>
      {state.following ? <BellRing aria-hidden /> : <BellPlus aria-hidden />}
      {state.following ? "Following" : "Follow"}
      <span className="rounded-full bg-background/60 px-1.5 text-xs tabular-nums">{state.followers}</span>
    </Button>
  );
}
