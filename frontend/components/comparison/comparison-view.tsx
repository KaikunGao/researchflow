"use client";

import { BarChart3, LineChart as LineChartIcon, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { MetricDataTable } from "@/components/analytics/metric-data-table";
import { metricGroups } from "@/components/analytics/analytics-view";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { CompanyMultiSelect } from "@/components/comparison/company-multi-select";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyDataState } from "@/components/shared/empty-data-state";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePanel } from "@/hooks/use-panel";
import { buildCompanyTrend, getMetric, lastPeriods, quarterLabel } from "@/lib/panel";

const MIN_COMPANIES = 2;
const MAX_COMPANIES = 10;
type ChartMode = "bar" | "line";
const WINDOW_OPTIONS = [
  { value: "4", label: "最近 4 期" },
  { value: "8", label: "最近 8 期" },
  { value: "12", label: "最近 12 期" },
  { value: "all", label: "全部报告期" },
];

export function ComparisonView() {
  const panel = usePanel();
  const data = panel.data;
  const [selectedState, setSelected] = useState<string[] | null>(null);
  const [metricKey, setMetricKey] = useState("net_margin");
  const [chartMode, setChartMode] = useState<ChartMode>("bar");
  const [window, setWindow] = useState("8");

  const selected = useMemo(() => {
    if (!data) return [];
    if (selectedState === null) return data.companies.slice(0, 4).map((c) => c.code);
    return selectedState.filter((c) => data.companies.some((x) => x.code === c));
  }, [data, selectedState]);

  const metric = data ? getMetric(data, metricKey) : null;
  const companies = useMemo(() => (data ? selected.map((c) => data.companies.find((x) => x.code === c)).filter((c): c is NonNullable<typeof c> => !!c) : []), [data, selected]);
  const periods = useMemo(() => {
    if (!data || data.periods.length === 0) return [];
    const latest = data.periods[data.periods.length - 1];
    return window === "all" ? data.periods : lastPeriods(data, latest, Number(window));
  }, [data, window]);
  const trend = useMemo(() => (data && periods.length ? buildCompanyTrend(data, companies, metricKey, periods) : null), [data, companies, metricKey, periods]);
  const groups = useMemo(() => (data ? metricGroups(data.metrics) : []), [data]);
  const enough = companies.length >= MIN_COMPANIES;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Company Comparison" title="公司对比" description={`选择 ${MIN_COMPANIES}–${MAX_COMPANIES} 家公司，在同一财务指标上进行横向对比。`} />

      {panel.error && <PhaseNotice tone="warning" message={`无法加载分析数据：${panel.error}`} />}
      {panel.loading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> 正在加载分析数据…</div>
      )}
      {data && data.companies.length === 0 && <EmptyDataState onImported={panel.reload} />}

      {data && data.companies.length > 0 && metric && trend && (
        <div className="grid gap-4 xl:grid-cols-5">
          <SectionCard
            title="选择公司"
            description={`已选 ${companies.length} / ${MAX_COMPANIES}`}
            className="xl:col-span-2"
            actions={<Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={selected.length === 0}>清空</Button>}
          >
            <CompanyMultiSelect companies={data.companies} selected={selected} onChange={setSelected} max={MAX_COMPANIES} />
          </SectionCard>

          <div className="flex flex-col gap-4 xl:col-span-3">
            <SectionCard
              title="对比图表"
              description={`Comparison Chart · ${metric.label}（${metric.unit}） · ${periods[0] ? quarterLabel(data, periods[0]) : ""} – ${periods.length ? quarterLabel(data, periods[periods.length - 1]) : ""}`}
              actions={
                <>
                  <SelectField value={metricKey} onChange={setMetricKey} options={[]} groups={groups} ariaLabel="Financial Metric 选择器" size="sm" />
                  <SelectField value={window} onChange={setWindow} options={WINDOW_OPTIONS} ariaLabel="报告期范围" size="sm" />
                  <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as ChartMode)}>
                    <TabsList>
                      <TabsTrigger value="bar" aria-label="柱状图"><BarChart3 className="size-3.5" /></TabsTrigger>
                      <TabsTrigger value="line" aria-label="折线图"><LineChartIcon className="size-3.5" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                </>
              }
            >
              {enough ? (
                chartMode === "bar" ? (
                  <ComparisonBarChart data={trend.data} series={trend.series} unit={metric.unit} />
                ) : (
                  <TrendLineChart data={trend.data} series={trend.series} unit={metric.unit} height={320} />
                )
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">请至少选择 {MIN_COMPANIES} 家公司以生成对比图表</div>
              )}
            </SectionCard>

            <SectionCard
              title="公司对比表格"
              description="Company Comparison Table · 各报告期数值与区间均值"
              actions={<div className="flex flex-wrap gap-1">{companies.map((c) => <Badge key={c.code} variant="secondary" className="font-normal">{c.name}</Badge>)}</div>}
            >
              <MetricDataTable panel={data} companies={companies} metric={metric} periods={periods} showAverage />
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
