/** 图表使用的 CSS 变量色板，与 globals.css 中的 --chart-* 对应 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.55 0.17 25)",
  "oklch(0.5 0.12 160)",
  "oklch(0.6 0.16 340)",
  "oklch(0.45 0.08 240)",
  "oklch(0.7 0.12 100)",
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--muted-foreground)",
} as const;

export const GRID_STROKE = "var(--border)";

export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
  itemStyle: { padding: 0 },
} as const;
