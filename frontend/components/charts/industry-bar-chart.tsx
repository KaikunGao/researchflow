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
import type { GroupPerformance } from "@/lib/panel";

interface IndustryBarChartProps {
  data: GroupPerformance[];
  bars: { key: string; label: string }[];
  height?: number;
}

/** 分组柱状图：X 轴为子行业或公司，柱为百分比指标 */
export function IndustryBarChart({ data, bars, height = 280 }: IndustryBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }} barGap={4}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? "end" : "middle"} height={data.length > 6 ? 48 : 30} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => `${v}%`} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} formatter={(value) => (typeof value === "number" ? `${value.toFixed(1)}%` : "—")} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} name={b.label} fill={chartColor(i)} radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
