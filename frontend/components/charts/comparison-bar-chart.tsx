"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE, chartColor } from "@/components/charts/chart-theme";
import type { TrendPoint, TrendSeries } from "@/lib/panel";

interface ComparisonBarChartProps {
  data: TrendPoint[];
  series: TrendSeries[];
  unit: string;
  height?: number;
}

/** 分组柱状图：X 轴为报告期，每组内为各公司 */
export function ComparisonBarChart({ data, series, unit, height = 320 }: ComparisonBarChartProps) {
  const isPct = unit === "%" || unit === "pct";
  const suffix = unit === "%" ? "%" : unit === "pct" ? " pct" : unit === "亿元" ? " 亿" : unit === "天" ? " 天" : "";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barGap={2} barCategoryGap="20%">
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="periodLabel" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => (isPct ? `${v}%` : `${v}`)} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} formatter={(value) => (typeof value === "number" ? `${value.toFixed(unit === "亿元" ? 2 : 1)}${suffix}` : "—")} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={chartColor(i)} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
