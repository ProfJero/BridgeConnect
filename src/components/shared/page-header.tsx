import * as React from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2", className)}>
      <div className="min-w-0 flex-1 space-y-0.5">
        {eyebrow ? <div className="text-xs font-semibold tracking-wide text-link uppercase">{eyebrow}</div> : null}
        <h1 className="text-2xl font-extrabold tracking-tight text-balance text-heading sm:text-[28px]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 text-[17px] font-bold tracking-tight text-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
