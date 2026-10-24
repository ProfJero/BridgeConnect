import * as Sentry from "@sentry/nextjs";

/**
 * Server/edge error monitoring. Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
 * Never attach credentials, tokens or passwords to events (see lib/monitoring.ts).
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
