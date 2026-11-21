"use client";

import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import { setPostResolvedAction } from "../actions";

export function ResolveButton({ postId, resolved }: { postId: string; resolved: boolean }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setPostResolvedAction(postId, !resolved))}>
      {resolved ? <RotateCcw aria-hidden /> : <CheckCircle2 aria-hidden />}
      {resolved ? "Reopen" : "Mark resolved"}
    </Button>
  );
}
