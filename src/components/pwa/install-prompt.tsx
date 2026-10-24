"use client";

import { Download, Share, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "bc-install-dismissed";

function wasDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < 1000 * 60 * 60 * 24 * 30;
  } catch {
    return false;
  }
}

/**
 * "Install BridgeConnect" card. Chromium browsers fire `beforeinstallprompt`; iOS Safari has no prompt API, so
 * it gets Add-to-Home-Screen instructions instead. Dismissal is remembered for 30 days.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || wasDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    const timer = isIos && !("standalone" in navigator && navigator.standalone) ? setTimeout(() => setIos(true), 4000) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setDeferred(null);
    setIos(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage blocked: the card simply reappears next visit.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (!deferred && !ios) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-lg lg:bottom-4"
    >
      <div className="flex items-start gap-3">
        <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1">
          <p id="install-title" className="font-semibold">Install BridgeConnect</p>
          {deferred ? (
            <p className="text-sm text-muted-foreground">Add it to your home screen — opens fast and uses less data.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tap <Share aria-label="Share" className="inline size-4 align-text-bottom" /> then <strong>Add to Home Screen</strong>.
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss">
          <X aria-hidden />
        </Button>
      </div>
      {deferred ? (
        <Button className="mt-3 w-full" onClick={() => void install()}>
          <Download aria-hidden /> Install app
        </Button>
      ) : null}
    </div>
  );
}
