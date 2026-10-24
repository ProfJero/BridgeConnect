/**
 * Chart colours as literal values. SVG presentation attributes (which Recharts
 * writes) cannot resolve CSS custom properties, so these mirror --chart-1/2 in
 * globals.css. Validated with the dataviz palette checks against the card surface.
 */
export const CHART_COLORS = {
  primary: "#2c5fd6",
  secondary: "#1e8f4e",
  grid: "#e3e8ef",
  axis: "#64748b",
  axisStrong: "#1e293b",
} as const;
