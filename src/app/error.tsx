"use client";

import { WifiOff } from "lucide-react";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/monitoring";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, { context: "route-error", digest: error.digest });
  }, [error]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main id="main">
      <ErrorState
        icon={offline ? WifiOff : undefined}
        title={offline ? "You're offline" : "Something went wrong"}
        description={
          offline
            ? "Check your internet connection, then try again."
            : "We couldn't load this page. Please try again in a moment."
        }
      >
        <Button onClick={() => retry()}>Try again</Button>
      </ErrorState>
    </main>
  );
}
