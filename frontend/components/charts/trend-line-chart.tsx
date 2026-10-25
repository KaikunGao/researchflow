"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE, chartColor } from "@/components/charts/chart-theme";
import type { TrendPoint, TrendSeries } from "@/lib/panel";

interface TrendLineChartProps {
  data: TrendPoint[];
  series: TrendSeries[];
  /** 数值单位：亿元 / % / pct / 天 */
  unit: string;
  height?: number;
  emphasisKey?: string;
}

function suffixOf(unit: string): string {
  if (unit === "%") return "%";
  if (unit === "pct") return " pct";
  if (unit === "亿元") return " 亿";
  if (unit === "天") return " 天";
  return "";
}

export function TrendLineChart({ data, series, unit, height = 280, emphasisKey }: TrendLineChartProps) {
  const isPct = unit === "%" || unit === "pct";
  const showZero = data.some((p) => series.some((s) => typeof p[s.key] === "number" && (p[s.key] as number) < 0));
  const suffix = suffixOf(unit);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="periodLabel" tick={AXIS_STYLE} axisLine={false} tickLine={false} interval={data.length > 10 ? 1 : 0} />
        <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => (isPct ? `${v}%` : `${v}`)} />
        {showZero && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeDasharray="2 2" />}
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => (typeof value === "number" ? `${value.toFixed(unit === "亿元" ? 2 : 1)}${suffix}` : "—")} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="plainline" />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={chartColor(i)}
            strokeWidth={emphasisKey === s.key ? 2.5 : 1.75}
            dot={{ r: 2.5, strokeWidth: 0, fill: chartColor(i) }}
            activeDot={{ r: 4 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
