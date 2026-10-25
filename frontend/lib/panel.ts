/**
 * 对分析面板数据（AnalyticsPanel）的客户端派生计算：
 * 筛选、均值、趋势序列、排名、格式化。所有页面共用，避免各自实现口径。
 */

import type { AnalyticsPanel, NumberOrNull, PanelCompany, PanelMetric } from "@/types/api";

export type IndustryFilter = "all" | string;

export function filterCompanies(panel: AnalyticsPanel, filter: IndustryFilter): PanelCompany[] {
  if (filter === "all") return panel.companies;
  return panel.companies.filter((c) => c.sub_industry === filter);
}

export function getMetric(panel: AnalyticsPanel, key: string): PanelMetric {
  return panel.metrics.find((m) => m.key === key) ?? panel.metrics[0];
}

export function valueAt(panel: AnalyticsPanel, code: string, period: string, metric: string): NumberOrNull {
  return panel.data[code]?.[period]?.values[metric] ?? null;
}

export function quarterLabel(panel: AnalyticsPanel, period: string): string {
  const [year, month] = period.split("-");
  const quarter = { "03": 1, "06": 2, "09": 3, "12": 4 }[month] ?? 0;
  return `${year}Q${quarter}`;
}

export function periodLabel(panel: AnalyticsPanel, period: string): string {
  return panel.period_labels[period] ?? period;
}

export function previousPeriod(panel: AnalyticsPanel, period: string): string | null {
  const idx = panel.periods.indexOf(period);
  return idx > 0 ? panel.periods[idx - 1] : null;
}

export function periodRange(panel: AnalyticsPanel, start: string, end: string): string[] {
  const s = panel.periods.indexOf(start);
  const e = panel.periods.indexOf(end);
  if (s < 0 || e < 0) return panel.periods;
  const [from, to] = s <= e ? [s, e] : [e, s];
  return panel.periods.slice(from, to + 1);
}

export function lastPeriods(panel: AnalyticsPanel, upTo: string, count: number): string[] {
  const idx = panel.periods.indexOf(upTo);
  const end = idx >= 0 ? idx + 1 : panel.periods.length;
  return panel.periods.slice(Math.max(0, end - count), end);
}

export function average(values: NumberOrNull[]): number | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function averageMetric(panel: AnalyticsPanel, companies: PanelCompany[], period: string, metric: string): number | null {
  return average(companies.map((c) => valueAt(panel, c.code, period, metric)));
}

export function round(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/* ------------------------------------------------------------------ trends */

export interface TrendPoint {
  period: string;
  periodLabel: string;
  [seriesKey: string]: number | string | null;
}

export interface TrendSeries {
  key: string;
  label: string;
}

/** 每家公司一条线 */
export function buildCompanyTrend(
  panel: AnalyticsPanel,
  companies: PanelCompany[],
  metric: string,
  periods: string[],
): { data: TrendPoint[]; series: TrendSeries[] } {
  const series = companies.map((c) => ({ key: c.code, label: c.name }));
  const data = periods.map((period) => {
    const point: TrendPoint = { period, periodLabel: quarterLabel(panel, period) };
    for (const c of companies) point[c.code] = round(valueAt(panel, c.code, period, metric));
    return point;
  });
  return { data, series };
}

/** 全行业视角：整体均值 + 各子行业均值；子行业视角：各公司 */
export function buildGroupedTrend(
  panel: AnalyticsPanel,
  filter: IndustryFilter,
  metric: string,
  periods: string[],
): { data: TrendPoint[]; series: TrendSeries[]; emphasisKey?: string } {
  if (filter !== "all") {
    return buildCompanyTrend(panel, filterCompanies(panel, filter), metric, periods);
  }
  const subs = panel.sub_industries;
  const series: TrendSeries[] = [{ key: "__all", label: "板块整体" }, ...subs.map((s) => ({ key: s.key, label: s.label }))];
  const data = periods.map((period) => {
    const point: TrendPoint = { period, periodLabel: quarterLabel(panel, period) };
    point.__all = round(averageMetric(panel, panel.companies, period, metric));
    for (const s of subs) point[s.key] = round(averageMetric(panel, filterCompanies(panel, s.key), period, metric));
    return point;
  });
  return { data, series, emphasisKey: "__all" };
}

export interface GroupPerformance {
  key: string;
  label: string;
  companyCount: number;
  [metric: string]: number | string | null;
}

/** 行业表现：全行业按子行业分组，子行业按公司 */
export function buildGroupPerformance(panel: AnalyticsPanel, filter: IndustryFilter, period: string, metrics: string[]): GroupPerformance[] {
  if (filter === "all") {
    return panel.sub_industries.map((s) => {
      const list = filterCompanies(panel, s.key);
      const row: GroupPerformance = { key: s.key, label: s.label, companyCount: list.length };
      for (const m of metrics) row[m] = round(averageMetric(panel, list, period, m));
      return row;
    });
  }
  return filterCompanies(panel, filter).map((c) => {
    const row: GroupPerformance = { key: c.code, label: c.name, companyCount: 1 };
    for (const m of metrics) row[m] = round(valueAt(panel, c.code, period, m));
    return row;
  });
}

/* ------------------------------------------------------------------ ranking */

export interface RankingRow {
  rank: number;
  company: PanelCompany;
  value: number | null;
  delta: number | null;
}

export function rankCompanies(panel: AnalyticsPanel, companies: PanelCompany[], metricKey: string, period: string): RankingRow[] {
  const metric = getMetric(panel, metricKey);
  const prev = previousPeriod(panel, period);
  const rows = companies.map((company) => {
    const value = valueAt(panel, company.code, period, metricKey);
    const prevValue = prev ? valueAt(panel, company.code, prev, metricKey) : null;
    return { company, value, delta: value !== null && prevValue !== null ? round(value - prevValue) : null };
  });
  rows.sort((a, b) => {
    const av = a.value ?? Number.NEGATIVE_INFINITY;
    const bv = b.value ?? Number.NEGATIVE_INFINITY;
    return metric.higher_is_better ? bv - av : av - bv;
  });
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/* ------------------------------------------------------------------ format */

export function formatMetric(value: NumberOrNull, metric: PanelMetric, signed = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (metric.unit) {
    case "亿元":
      return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "%":
      return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "pct":
      return `${signed && value > 0 ? "+" : ""}${value.toFixed(1)} pct`;
    case "天":
      return `${value.toFixed(0)} 天`;
    default:
      return value.toFixed(2);
  }
}

export function axisFormatter(metric: PanelMetric): (v: number) => string {
  if (metric.unit === "%" || metric.unit === "pct") return (v) => `${v}%`;
  return (v) => `${v}`;
}

export function isGrowthMetric(metric: PanelMetric): boolean {
  return metric.unit === "%" && (metric.key.includes("yoy") || metric.key.includes("qoq")) || metric.unit === "pct";
}

export const SEVERITY_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };
export const STATUS_LABEL: Record<string, string> = { active: "活跃", acknowledged: "已确认", resolved: "已解除" };
