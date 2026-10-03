import * as Sentry from "@sentry/nextjs";

/**
 * Report an unexpected error. Sends to Sentry when NEXT_PUBLIC_SENTRY_DSN is
 * configured, otherwise logs to the server console. Never pass credentials,
 * tokens or passwords in `extra`.
 */
export function reportError(error: unknown, extra?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra });
    return;
  }
  console.error("[BridgeConnect]", extra?.context ?? "error", error);
}
