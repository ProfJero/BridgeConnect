import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import * as React from "react";

export function ErrorState({
  icon: Icon = AlertTriangle,
  code,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  code?: string;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
        <Icon aria-hidden className="size-7" />
      </div>
      {code ? <p className="text-sm font-semibold tracking-wide text-primary">{code}</p> : null}
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {children ? <div className="flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
