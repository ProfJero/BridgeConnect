"use client";

import { Ban, CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import { setConversationStatusAction } from "../actions";

export function ConversationActions({
  conversationId,
  status,
  side,
  canBlock,
}: {
  conversationId: string;
  status: "open" | "closed" | "blocked";
  side: "user" | "entity";
  canBlock: boolean;
}) {
  const { pending, run } = useServerAction();
  const set = (s: "open" | "closed" | "blocked") => run(() => setConversationStatusAction(conversationId, s));
  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => set("closed")}>
          <CheckCircle2 aria-hidden /> Mark as done
        </Button>
      ) : null}
      {side === "entity" && status !== "open" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => set("open")}>
          <RotateCcw aria-hidden /> Reopen
        </Button>
      ) : null}
      {side === "entity" && canBlock && status !== "blocked" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Block this contact? They will no longer be able to message you.")) set("blocked");
          }}
        >
          <Ban aria-hidden /> Block contact
        </Button>
      ) : null}
    </div>
  );
}
