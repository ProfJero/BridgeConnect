"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ACCENT_COOKIE, ACCENTS, THEME_COOKIE, type Accent, type Theme } from "./theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

function applyTheme(next: Theme) {
  persist(THEME_COOKIE, next);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (next !== "system") root.classList.add(next);
}

function applyAccent(next: Accent) {
  persist(ACCENT_COOKIE, next);
  document.documentElement.setAttribute("data-accent", next);
}

/** Saves choices in cookies that the root layout reads, so the right theme renders on the server. */
export function ThemeSwitcher({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-grid grid-cols-3 gap-1 rounded-xl border bg-muted p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => {
            setTheme(value);
            applyTheme(value);
          }}
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

/** Colour theme swatches. Each swatch renders with its own palette tokens. */
export function AccentPicker({ initial }: { initial: Accent }) {
  const [accent, setAccent] = useState<Accent>(initial);
  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {ACCENTS.map(({ value, label }) => {
        const on = accent === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            data-accent={value}
            onClick={() => {
              setAccent(value);
              applyAccent(value);
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border bg-card p-2.5 text-xs font-medium transition active:scale-95",
              on && "border-primary ring-2 ring-primary/40",
            )}
          >
            <span className="relative flex size-10 overflow-hidden rounded-full shadow-sm">
              <span className="w-1/2 bg-primary" />
              <span className="w-1/2 bg-gradient-to-b from-nav-1 to-nav-2" />
              {on ? (
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <Check aria-hidden className="size-5 drop-shadow" />
                </span>
              ) : null}
            </span>
            <span className="text-foreground">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
