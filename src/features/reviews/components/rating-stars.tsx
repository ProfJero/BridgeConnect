import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Read-only star rating. The numeric value is always available as text for screen readers. */
export function RatingStars({
  value,
  count,
  size = "sm",
  className,
}: {
  value: number | null;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const rating = value ?? 0;
  const icon = size === "md" ? "size-5" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(icon, i <= Math.round(rating) ? "fill-warning text-warning" : "fill-muted text-muted-foreground/40")}
          />
        ))}
      </span>
      <span className="sr-only">
        {value ? `Rated ${rating.toFixed(1)} out of 5` : "Not yet rated"}
        {count !== undefined ? ` from ${count} ${count === 1 ? "review" : "reviews"}` : ""}
      </span>
      {value ? (
        <span aria-hidden className="text-xs font-semibold tabular-nums">
          {rating.toFixed(1)}
          {count !== undefined ? <span className="font-normal text-muted-foreground"> ({count})</span> : null}
        </span>
      ) : null}
    </span>
  );
}
