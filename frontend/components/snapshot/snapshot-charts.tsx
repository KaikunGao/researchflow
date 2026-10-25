"use client";

import { ImageDown, Loader2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportChartAsPng, type LegendEntry } from "@/lib/chart-export";

/** 导出 PNG 时 CSS 变量无法解析，因此速览图表使用固定色值 */
export const SNAPSHOT_COLORS = {
  navy: "#1e3a8a",
  amber: "#d97706",
  teal: "#0891b2",
  violet: "#7c3aed",
  slate: "#64748b",
  red: "#dc2626",
} as const;

const AXIS = { fontSize: 11, fill: "#64748b" } as const;
const GRID = "#e5e7eb";
const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 4px 16px rgba(15,23,42,.08)" },
  labelStyle: { color: "#64748b", marginBottom: 4 },
  itemStyle: { padding: 0 },
} as const;

export const CHART_SOURCE = "资料来源：导入数据（Wind / Choice 导出），ResearchFlow 整理";

interface ChartCardProps {
  title: string;
  subtitle: string;
  fileName: string;
  legend: LegendEntry[];
  source?: string;
  children: ReactNode;
}

/** 带标题与「导出 PNG」按钮的图表卡片 */
export function ChartCard({ title, subtitle, fileName, legend, source = CHART_SOURCE, children }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!ref.current) return;
    setExporting(true);
    setError(null);
    try {
      await exportChartAsPng({ container: ref.current, fileName, title, subtitle, legend, source });
    } catch (err) {
      setError(err instanceof Error ? err.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-2 px-4">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <ImageDown className="size-3.5" />}
          导出 PNG
        </Button>
      </CardHeader>
      <CardContent className="px-4">
        <div ref={ref}>{children}</div>
        {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      </CardContent>
    </Card>
  );
}

export interface BarLinePoint {
  label: string;
  value: number | null;
  growth: number | null;
}

interface BarLineChartProps {
  data: BarLinePoint[];
  valueName: string;
  growthName: string;
  height?: number;
}

/** 金额柱 + 同比增速线（双轴），财报点评最常用的图式 */
export function BarLineChart({ data, valueName, growthName, height = 260 }: BarLineChartProps) {
  const hasNegativeGrowth = data.some((d) => d.growth !== null && d.growth < 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 44 : 30} />
        <YAxis yAxisId="left" tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${v}`} />
        <YAxis yAxisId="right" orientation="right" tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${v}%`} />
        {hasNegativeGrowth && <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="2 2" />}
        <Tooltip
          {...TOOLTIP_STYLE}
          cursor={{ fill: "#f1f5f9" }}
          formatter={(value, name) =>
            typeof value === "number" ? (name === growthName ? `${value.toFixed(1)}%` : `${value.toFixed(2)} 亿元`) : "—"
          }
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <Bar yAxisId="left" dataKey="value" name={valueName} fill={SNAPSHOT_COLORS.navy} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        <Line yAxisId="right" type="monotone" dataKey="growth" name={growthName} stroke={SNAPSHOT_COLORS.amber} strokeWidth={2} dot={{ r: 3, fill: SNAPSHOT_COLORS.amber, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface LineSeriesDef {
  key: string;
  name: string;
  color: string;
}

export interface LinePoint {
  label: string;
  [key: string]: number | string | null;
}

interface MultiLineChartProps {
  data: LinePoint[];
  series: LineSeriesDef[];
  height?: number;
}

/** 多条比率折线（%） */
export function MultiLineChart({ data, series, height = 260 }: MultiLineChartProps) {
  const hasNegative = data.some((d) => series.some((s) => typeof d[s.key] === "number" && (d[s.key] as number) < 0));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -30 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 44 : 30} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${v}%`} />
        {hasNegative && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />}
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => (typeof value === "number" ? `${value.toFixed(2)}%` : "—")} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="plainline" />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
