"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** Keyboard-operable star picker (a radio group). */
export function StarInput({
  value,
  onChange,
  id,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  id: string;
  invalid?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" id={id} aria-label="Rating" aria-invalid={invalid || undefined} className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i > 1 ? "s" : ""} — ${LABELS[i]}`}
            tabIndex={value === i || (value === 0 && i === 1) ? 0 : -1}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onChange(Math.min(5, (value || 0) + 1));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onChange(Math.max(1, (value || 2) - 1));
              }
            }}
            className="rounded p-1 transition active:scale-90"
          >
            <Star aria-hidden className={cn("size-7", i <= shown ? "fill-warning text-warning" : "text-muted-foreground/50")} />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground" aria-live="polite">{LABELS[shown]}</span>
    </div>
  );
}
