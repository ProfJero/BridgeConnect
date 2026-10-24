"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/monitoring";

import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, { context: "global-error", digest: error.digest });
  }, [error]);
  return (
    <html lang="en-GH">
      <body className="flex min-h-dvh items-center justify-center p-6 font-sans">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">BridgeConnect is having trouble</h1>
          <p className="text-muted-foreground">Please try again in a moment.</p>
          <button
            onClick={() => retry()}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
