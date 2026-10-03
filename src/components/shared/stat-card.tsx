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
        <span className="block truncate text-sm text-muted-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs";
  return href ? (
    <Link href={href} className={cn(cls, "transition-shadow hover:shadow-md")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
