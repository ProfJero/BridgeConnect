"use client";

import { Loader2, SendHorizonal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { markConversationReadAction, sendMessageAction } from "../actions";

type Message = { id: string; sender_side: string; body: string; created_at: string; pending?: boolean };

/**
 * Chat thread. New messages arrive through Supabase Realtime (RLS-filtered to
 * participants); the client then refreshes the server-rendered list rather than
 * trusting the payload.
 */
export function MessageThread({
  conversationId,
  side,
  messages,
  canSend,
  disabledReason,
}: {
  conversationId: string;
  side: "user" | "entity";
  messages: Message[];
  canSend: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(messages, (state, msg: Message) => [...state, msg]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [optimistic.length]);

  useEffect(() => {
    void markConversationReadAction(conversationId);
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          void markConversationReadAction(conversationId);
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    setDraft("");
    startTransition(async () => {
      addOptimistic({ id: `tmp-${Date.now()}`, sender_side: side, body, created_at: new Date().toISOString(), pending: true });
      const result = await sendMessageAction({ conversationId, body });
      if (!result.ok) {
        toast.error(result.error);
        setDraft(body);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[60dvh] flex-col rounded-xl border bg-card">
      <ol className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4" aria-label="Messages" aria-live="polite">
        {optimistic.map((m) => {
          const mine = m.sender_side === side;
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-xs sm:max-w-[70%]",
                  mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                  m.pending && "opacity-70",
                )}
              >
                <span className="sr-only">{mine ? "You said:" : "They said:"}</span>
                <p className="break-words whitespace-pre-line">{m.body}</p>
                <time
                  dateTime={m.created_at}
                  className={cn("mt-0.5 block text-[10px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}
                >
                  {m.pending ? "Sending…" : formatDateTime(m.created_at)}
                </time>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
      {canSend ? (
        <form
          className="flex items-end gap-2 border-t p-2 sm:p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="message-draft" className="sr-only">Message</label>
          <Textarea
            id="message-draft"
            rows={1}
            maxLength={2000}
            value={draft}
            placeholder="Write a message…"
            className="max-h-40 min-h-10 resize-none"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button type="submit" size="icon" aria-label="Send message" disabled={pending || !draft.trim()}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <SendHorizonal aria-hidden />}
          </Button>
        </form>
      ) : (
        <p className="border-t p-3 text-center text-sm text-muted-foreground">{disabledReason}</p>
      )}
    </div>
  );
}
