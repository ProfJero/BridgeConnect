import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { ReloadButton } from "@/components/pwa/reload-button";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "You're offline", robots: noIndex };

/** Served by the service worker when a page can't be reached. Must not depend on the session or the database. */
export default function OfflinePage() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOff aria-hidden className="size-8 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re offline</h1>
        <p className="text-muted-foreground">
          Check your mobile data or Wi-Fi and try again. In an emergency, call <a className="font-semibold underline" href="tel:112">112</a>.
        </p>
      </div>
      <ReloadButton />
    </main>
  );
}
