"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { THEME_COOKIE, type Theme } from "./theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function applyTheme(next: Theme) {
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (next !== "system") root.classList.add(next);
}

/** Saves the choice in a cookie that the root layout reads, so the right theme renders on the server. */
export function ThemeSwitcher({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }
  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition",
            theme === value && "bg-card text-foreground shadow-xs",
          )}
        >
          <Icon aria-hidden className="size-4" /> {label}
        </button>
      ))}
    </div>
  );
}
