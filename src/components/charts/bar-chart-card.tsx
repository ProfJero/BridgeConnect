"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CHART_COLORS } from "./chart-colors";

export type BarDatum = { label: string; value: number };

/**
 * Single-series bar chart. One hue (no legend needed: the title names the
 * series), thin bars with 4px rounded data-ends, recessive grid, per-bar
 * tooltip, and a data table so no value depends on hovering.
 */
export function BarChartCard({
  title,
  description,
  data,
  color = CHART_COLORS.primary,
  layout = "vertical-bars",
  valueLabel = "Count",
  height = 220,
}: {
  title: string;
  description?: string;
  data: BarDatum[];
  color?: string;
  layout?: "vertical-bars" | "horizontal-bars";
  valueLabel?: string;
  height?: number;
}) {
  const horizontal = layout === "horizontal-bars";
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {total === 0 ? (
          <p className="flex items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground" style={{ height }}>
            No data for this period yet.
          </p>
        ) : (
          <div style={{ height }} aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : -16 }} barCategoryGap={horizontal ? 6 : 2}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="0" vertical={horizontal} horizontal={!horizontal} />
                {horizontal ? (
                  <>
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
                    <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART_COLORS.axisStrong }} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} />
                  </>
                )}
                <Tooltip
                  cursor={{ fill: CHART_COLORS.grid, fillOpacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                        <p className="font-bold tabular-nums">{Number(payload[0]!.value).toLocaleString("en-GH")}</p>
                        <p className="text-xs text-muted-foreground">{String(label ?? payload[0]!.payload.label)} · {valueLabel}</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="value" isAnimationActive={false} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary">View data table</summary>
          <table className="mt-2 w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead><tr className="text-xs text-muted-foreground"><th className="py-1 font-medium">Label</th><th className="py-1 text-right font-medium">{valueLabel}</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t"><td className="py-1">{d.label}</td><td className="py-1 text-right tabular-nums">{d.value.toLocaleString("en-GH")}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </CardContent>
    </Card>
  );
}
