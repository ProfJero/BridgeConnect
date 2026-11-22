import Image from "next/image";

import { cn } from "@/lib/utils";

/** The official BridgeConnect emblem (bridge, home, tree, circuit and community). */
export function LogoMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/emblem.webp"
      alt=""
      width={160}
      height={160}
      priority={priority}
      className={cn("size-9 shrink-0", className)}
    />
  );
}

export function Logo({
  className,
  wordmarkClassName,
  markClassName,
  showTagline = false,
}: {
  className?: string;
  /** e.g. hide the wordmark on very narrow screens where the header is crowded. */
  wordmarkClassName?: string;
  markClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} priority />
      <span className={cn("flex flex-col leading-none", wordmarkClassName)}>
        <span className="text-lg font-extrabold tracking-tight text-brand-navy">
          Bridge<span className="text-brand-green">Connect</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Connecting Communities. Empowering Lives.
          </span>
        ) : null}
      </span>
    </span>
  );
}
