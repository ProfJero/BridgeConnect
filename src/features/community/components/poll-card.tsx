"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import { votePollAction } from "../actions";
import type { PollData } from "../queries";

/** Accessible poll: a radio-like group of buttons, results shown as labelled bars after voting. */
export function PollCard({ postId, poll, signedIn }: { postId: string; poll: PollData; signedIn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const showResults = poll.closed || poll.myOptionId !== null;

  function vote(optionId: string) {
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    startTransition(async () => {
      const result = await votePollAction(postId, optionId);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <fieldset className="space-y-2 rounded-xl border bg-muted/40 p-3" aria-busy={pending}>
      <legend className="sr-only">Poll options</legend>
      {poll.options.map((o) => {
        const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        const mine = poll.myOptionId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={poll.closed || pending}
            aria-pressed={mine}
            onClick={() => vote(o.id)}
            className={cn(
              "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.99] disabled:cursor-default",
              mine ? "border-primary ring-1 ring-primary" : "hover:border-primary/50",
            )}
          >
            {showResults ? (
              <span aria-hidden className="absolute inset-y-0 left-0 bg-primary-soft" style={{ width: `${pct}%` }} />
            ) : null}
            <span className="relative flex items-center gap-2">
              {mine ? <CheckCircle2 aria-hidden className="size-4 text-primary" /> : null}
              {o.label}
              {mine ? <span className="sr-only">(your vote)</span> : null}
            </span>
            {showResults ? (
              <span className="relative tabular-nums text-muted-foreground">
                {pct}% <span className="sr-only">({o.votes} votes)</span>
              </span>
            ) : null}
          </button>
        );
      })}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock aria-hidden className="size-3.5" />
        {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"} ·{" "}
        {poll.closed ? "Poll closed" : poll.closesAt ? `Closes ${formatRelative(poll.closesAt)}` : "Open"}
        {!poll.closed && poll.myOptionId ? " · tap another option to change your vote" : null}
      </p>
    </fieldset>
  );
}
