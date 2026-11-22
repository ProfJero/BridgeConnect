import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "primary",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  tone?: "primary" | "green" | "warning" | "destructive";
  hint?: string;
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary-soft-foreground",
    green: "bg-brand-green-soft text-brand-green-soft-foreground",
    warning: "bg-warning-soft text-warning-soft-foreground",
    destructive: "bg-destructive-soft text-destructive-soft-foreground",
  }[tone];
  const body = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClass)}>
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl leading-tight font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-GH") : value}</span>
        <span className="block text-sm text-muted-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </>
  );
  const surface = {
    primary: "to-primary-soft/70",
    green: "to-brand-green-soft/70",
    warning: "to-warning-soft/80",
    destructive: "to-destructive-soft/70",
  }[tone];
  const cls = cn(
    "flex flex-col items-start gap-2 rounded-2xl border bg-gradient-to-br from-card p-4 shadow-xs transition-shadow hover:shadow-md min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3",
    surface,
  );
  return href ? (
    <Link href={href} className={cn(cls, "transition-shadow hover:shadow-md")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
