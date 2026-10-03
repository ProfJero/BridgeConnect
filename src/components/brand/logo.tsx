import { cn } from "@/lib/utils";

/** BridgeConnect mark: a bridge arc (blue) over a community path (green). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M6 20c3.5-7.5 16.5-7.5 20 0" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.5 15.6v6.4M16 13.4v8.6M21.5 15.6v6.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 24h22" className="stroke-brand-green" stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">
          Bridge<span className="text-brand-green">Connect</span>
        </span>
        {showTagline ? (
          <span className="mt-1 text-[11px] font-medium text-muted-foreground">
            Connecting Communities. Empowering Lives.
          </span>
        ) : null}
      </span>
    </span>
  );
}
