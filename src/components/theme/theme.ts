export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "bc-theme";

export function parseTheme(value: string | undefined): Theme {
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as Theme) : "system";
}

/** Accent palettes (see globals.css). "bridge" is the brand default. */
export const ACCENTS = [
  { value: "bridge", label: "Bridge Blue" },
  { value: "forest", label: "Forest" },
  { value: "royal", label: "Royal" },
  { value: "kente", label: "Kente Gold" },
  { value: "ocean", label: "Ocean" },
  { value: "rose", label: "Rose" },
] as const;
export type Accent = (typeof ACCENTS)[number]["value"];
export const ACCENT_COOKIE = "bc-accent";

export function parseAccent(value: string | undefined): Accent {
  return ACCENTS.some((a) => a.value === value) ? (value as Accent) : "bridge";
}
