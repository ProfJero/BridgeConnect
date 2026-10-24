"use client";

import { Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const noopSubscribe = () => () => {};

/**
 * Share a public page. On phones the native share sheet is used (WhatsApp, SMS, …); elsewhere a menu offers
 * WhatsApp — the dominant channel in Ghana — Facebook, X and copy-link. `path` is a site-relative URL.
 */
export function ShareButton({ path, title, text }: { path: string; title: string; text?: string }) {
  function url() {
    return new URL(path, window.location.origin).toString();
  }

  // Touch devices with the Web Share API get the native share sheet; others get the menu below.
  const native = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function" && navigator.maxTouchPoints > 0,
    () => false,
  );

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url: url() });
    } catch {
      // The user dismissed the share sheet — nothing to do.
    }
  }

  function open(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  const message = () => `${text ? `${title} — ${text}` : title}\n${url()}`;

  if (native) {
    return (
      <Button variant="outline" onClick={() => void nativeShare()}>
        <Share2 aria-hidden /> Share
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Share2 aria-hidden /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => open(`https://wa.me/?text=${encodeURIComponent(message())}`)}>
          <MessageCircle aria-hidden /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}
        >
          <ExternalLink aria-hidden /> Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            open(`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url())}`)
          }
        >
          <ExternalLink aria-hidden /> X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy()}>
          <Copy aria-hidden /> Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
