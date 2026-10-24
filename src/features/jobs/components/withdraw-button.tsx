"use client";

import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-server-action";

import { withdrawJobApplicationAction } from "../actions";

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => withdrawJobApplicationAction(applicationId))}>
      Withdraw
    </Button>
  );
}
