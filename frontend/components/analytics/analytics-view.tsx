"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricDataTable } from "@/components/analytics/metric-data-table";
import { RankingList } from "@/components/analytics/ranking-list";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyDataState } from "@/components/shared/empty-data-state";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { usePanel } from "@/hooks/use-panel";
import {
  averageMetric,
  buildCompanyTrend,
  filterCompanies,
  formatMetric,
  getMetric,
  isGrowthMetric,
  periodLabel,
  periodRange,
  quarterLabel,
  rankCompanies,
  type IndustryFilter,
} from "@/lib/panel";

export function metricGroups(metrics: { key: string; label: string; group: string }[]) {
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const m of metrics) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group)!.push({ value: m.key, label: m.label });
  }
  return Array.from(groups, ([label, options]) => ({ label, options }));
}

export function AnalyticsView() {
  const panel = usePanel();
  const data = panel.data;
  const [metricKey, setMetricKey] = useState("revenue_yoy");
  const [industry, setIndustry] = useState<IndustryFilter>("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const effectiveStart = data && start && data.periods.includes(start) ? start : (data?.periods[Math.max(0, (data?.periods.length ?? 0) - 8)] ?? "");
  const effectiveEnd = data && end && data.periods.includes(end) ? end : (data?.periods[(data?.periods.length ?? 0) - 1] ?? "");

  const metric = data ? getMetric(data, metricKey) : null;
  const periods = useMemo(
    () => (data && effectiveStart && effectiveEnd ? periodRange(data, effectiveStart, effectiveEnd) : []),
    [data, effectiveStart, effectiveEnd],
  );
  const endOfRange = periods[periods.length - 1] ?? "";
  const companies = useMemo(() => (data ? filterCompanies(data, industry) : []), [data, industry]);
  const trend = useMemo(() => (data && periods.length ? buildCompanyTrend(data, companies, metricKey, periods) : null), [data, companies, metricKey, periods]);
  const ranking = useMemo(() => (data && endOfRange ? rankCompanies(data, companies, metricKey, endOfRange) : []), [data, companies, metricKey, endOfRange]);
  const avg = useMemo(() => (data && endOfRange ? averageMetric(data, companies, endOfRange, metricKey) : null), [data, companies, endOfRange, metricKey]);

  const industryOptions = useMemo(
    () => [{ value: "all", label: "医药生物（全部）" }, ...(data?.sub_industries ?? []).map((s) => ({ value: s.key, label: s.label }))],
    [data],
  );
  const periodOptions = useMemo(() => (data ? data.periods.map((p) => ({ value: p, label: periodLabel(data, p) })) : []), [data]);
  const groups = useMemo(() => (data ? metricGroups(data.metrics) : []), [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Financial Analytics" title="财务分析" description="选择财务指标与时间区间，查看趋势、排名与明细数据。" />

      {panel.error && <PhaseNotice tone="warning" message={`无法加载分析数据：${panel.error}`} />}
      {panel.loading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> 正在加载分析数据…</div>
      )}
      {data && data.companies.length === 0 && <EmptyDataState onImported={panel.reload} />}

      {data && data.companies.length > 0 && metric && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
            <SelectField value={metricKey} onChange={setMetricKey} options={[]} groups={groups} label="财务指标" ariaLabel="财务指标选择器" />
            <SelectField value={industry} onChange={setIndustry} options={industryOptions} label="范围" ariaLabel="子行业筛选" />
            <SelectField value={effectiveStart} onChange={setStart} options={periodOptions} label="起始" ariaLabel="起始报告期" />
            <SelectField value={effectiveEnd} onChange={setEnd} options={periodOptions} label="截至" ariaLabel="截至报告期" />
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{metric.unit}</Badge>
              <span>{metric.group}</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard title={`${metric.label}趋势`} description={`${periods[0] ? quarterLabel(data, periods[0]) : ""} – ${endOfRange ? quarterLabel(data, endOfRange) : ""} · ${companies.length} 家公司`} className="xl:col-span-3">
              {trend && <TrendLineChart data={trend.data} series={trend.series} unit={metric.unit} height={320} />}
            </SectionCard>
            <SectionCard
              title="公司财务表现排名"
              description={`按 ${endOfRange ? periodLabel(data, endOfRange) : ""} ${metric.short_label}${metric.higher_is_better ? "由高到低" : "由低到高"}排序 · 变化对比上一报告期`}
              className="xl:col-span-2"
              actions={avg !== null && <span className="text-xs text-muted-foreground">均值 <span className="font-medium text-foreground tabular">{formatMetric(avg, metric, isGrowthMetric(metric))}</span></span>}
            >
              <RankingList rows={ranking} metric={metric} />
            </SectionCard>
          </div>

          <SectionCard title="财务数据表格" description={`${metric.label}（${metric.unit}） · ${periods.length} 个报告期`}>
            <MetricDataTable panel={data} companies={companies} metric={metric} periods={periods} showAverage />
          </SectionCard>

          <p className="text-[11px] leading-relaxed text-muted-foreground">{data.methodology}</p>
        </>
      )}
    </div>
  );
}
