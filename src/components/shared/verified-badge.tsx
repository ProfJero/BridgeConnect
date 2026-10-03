import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function VerifiedBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-semibold text-brand-green-soft-foreground", className)}
      title="Verified by Digital Bridge Initiative"
    >
      <BadgeCheck aria-hidden className="size-4 text-brand-green" />
      {compact ? <span className="sr-only">Verified</span> : "Verified"}
    </span>
  );
}
