"use client";

import { AlertTriangle, Building2, Loader2, Percent, RefreshCw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { IndustryBarChart } from "@/components/charts/industry-bar-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { PageHeader } from "@/components/layout/page-header";
import { BackendStatus } from "@/components/overview/backend-status";
import { CompanyOverviewTable, type OverviewRow } from "@/components/overview/company-overview-table";
import { KpiCard } from "@/components/overview/kpi-card";
import { RecentAlerts } from "@/components/overview/recent-alerts";
import { DeltaText } from "@/components/shared/delta-text";
import { EmptyDataState } from "@/components/shared/empty-data-state";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { usePanel } from "@/hooks/use-panel";
import { listAlerts } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import {
  averageMetric,
  buildGroupPerformance,
  buildGroupedTrend,
  filterCompanies,
  lastPeriods,
  periodLabel,
  previousPeriod,
  valueAt,
  type IndustryFilter,
} from "@/lib/panel";

export function OverviewDashboard() {
  const panel = usePanel();
  const alerts = useAsync(() => listAlerts("active"));
  const [industry, setIndustry] = useState<IndustryFilter>("all");
  const [period, setPeriod] = useState<string>("");

  const data = panel.data;
  const latest = data?.periods[data.periods.length - 1] ?? "";
  const effectivePeriod = period && data?.periods.includes(period) ? period : latest;

  const companies = useMemo(() => (data ? filterCompanies(data, industry) : []), [data, industry]);
  const codes = useMemo(() => new Set(companies.map((c) => c.code)), [companies]);
  const activeAlerts = useMemo(() => (alerts.data ?? []).filter((a) => codes.has(a.code)), [alerts.data, codes]);

  const kpis = useMemo(() => {
    if (!data || !effectivePeriod) return null;
    const prev = previousPeriod(data, effectivePeriod);
    const growth = averageMetric(data, companies, effectivePeriod, "revenue_yoy");
    const growthPrev = prev ? averageMetric(data, companies, prev, "revenue_yoy") : null;
    const margin = averageMetric(data, companies, effectivePeriod, "net_margin");
    const marginPrev = prev ? averageMetric(data, companies, prev, "net_margin") : null;
    return {
      growth,
      growthDelta: growth !== null && growthPrev !== null ? growth - growthPrev : null,
      margin,
      marginDelta: margin !== null && marginPrev !== null ? margin - marginPrev : null,
      high: activeAlerts.filter((a) => a.severity === "high").length,
    };
  }, [data, companies, effectivePeriod, activeAlerts]);

  const trend = useMemo(
    () => (data && effectivePeriod ? buildGroupedTrend(data, industry, "revenue_yoy", lastPeriods(data, effectivePeriod, 8)) : null),
    [data, industry, effectivePeriod],
  );
  const performance = useMemo(
    () => (data && effectivePeriod ? buildGroupPerformance(data, industry, effectivePeriod, ["revenue_yoy", "net_margin"]) : []),
    [data, industry, effectivePeriod],
  );
  const rows = useMemo<OverviewRow[]>(() => {
    if (!data || !effectivePeriod) return [];
    return companies
      .map((company) => ({
        company,
        period: data.data[company.code]?.[effectivePeriod]?.period_end ?? null,
        revenue: valueAt(data, company.code, effectivePeriod, "revenue"),
        revenueYoy: valueAt(data, company.code, effectivePeriod, "revenue_yoy"),
        netProfit: valueAt(data, company.code, effectivePeriod, "net_profit"),
        netProfitYoy: valueAt(data, company.code, effectivePeriod, "net_profit_yoy"),
        netMargin: valueAt(data, company.code, effectivePeriod, "net_margin"),
        roe: valueAt(data, company.code, effectivePeriod, "roe_diluted"),
        activeAlerts: activeAlerts.filter((a) => a.code === company.code).length,
      }))
      .sort((a, b) => (b.revenue ?? -Infinity) - (a.revenue ?? -Infinity));
  }, [data, companies, effectivePeriod, activeAlerts]);

  const industryOptions = useMemo(
    () => [{ value: "all", label: "医药生物（全部）" }, ...(data?.sub_industries ?? []).map((s) => ({ value: s.key, label: s.label }))],
    [data],
  );
  const periodOptions = useMemo(() => (data ? [...data.periods].reverse().map((p) => ({ value: p, label: periodLabel(data, p) })) : []), [data]);
  const scopeLabel = industry === "all" ? "医药生物" : (data?.sub_industries.find((s) => s.key === industry)?.label ?? industry);

  function refreshAll() {
    panel.reload();
    alerts.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research Overview"
        title="研究总览"
        description="监控上市公司财务表现，简化行业研究工作流程。"
        actions={
          <>
            <SelectField value={industry} onChange={setIndustry} options={industryOptions} label="行业" ariaLabel="行业选择器" disabled={!data} />
            <SelectField value={effectivePeriod} onChange={setPeriod} options={periodOptions} label="报告期" ariaLabel="财务周期选择器" disabled={!data} />
            <Button variant="outline" onClick={refreshAll} disabled={panel.loading}>
              <RefreshCw className={panel.loading ? "size-4 animate-spin" : "size-4"} />
              Refresh Data
            </Button>
          </>
        }
      />

      <BackendStatus />

      {panel.error && <PhaseNotice tone="warning" message={`无法加载分析数据：${panel.error}`} />}

      {panel.loading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 正在加载分析数据…
        </div>
      )}

      {data && data.companies.length === 0 && <EmptyDataState onImported={refreshAll} />}

      {data && data.companies.length > 0 && kpis && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="覆盖公司数" labelEn="Companies Tracked" value={`${companies.length}`} icon={Building2} footer={<span>{scopeLabel} · A 股 · 数据截至 {periodLabel(data, effectivePeriod)}</span>} />
            <KpiCard
              label="平均营收增速"
              labelEn="Average Revenue Growth"
              value={kpis.growth !== null ? formatPercent(kpis.growth, { signed: true }) : "—"}
              icon={TrendingUp}
              tone={kpis.growth !== null && kpis.growth < 0 ? "negative" : "default"}
              footer={<><DeltaText value={kpis.growthDelta} suffix="pp" /><span>较上一报告期</span></>}
            />
            <KpiCard
              label="平均净利率"
              labelEn="Average Net Profit Margin"
              value={kpis.margin !== null ? formatPercent(kpis.margin) : "—"}
              icon={Percent}
              footer={<><DeltaText value={kpis.marginDelta} suffix="pp" /><span>较上一报告期</span></>}
            />
            <KpiCard
              label="活跃告警"
              labelEn="Active Alerts"
              value={`${activeAlerts.length}`}
              icon={AlertTriangle}
              tone={kpis.high > 0 ? "negative" : "default"}
              footer={<span>其中高严重度 {kpis.high} 条 · 基于最新报告期</span>}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard
              title="营收增速趋势"
              description={industry === "all" ? `Revenue Growth Trends · 累计同比 · 子行业平均 · 最近 ${trend?.data.length ?? 0} 个报告期` : `Revenue Growth Trends · 累计同比 · ${scopeLabel}各公司`}
              className="xl:col-span-3"
            >
              {trend && <TrendLineChart data={trend.data} series={trend.series} unit="%" emphasisKey={trend.emphasisKey} />}
            </SectionCard>
            <SectionCard title="行业表现" description={`Industry Performance · ${periodLabel(data, effectivePeriod)} · 营收增速与净利率`} className="xl:col-span-2">
              <IndustryBarChart data={performance} bars={[{ key: "revenue_yoy", label: "营收同比增速" }, { key: "net_margin", label: "净利率" }]} />
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <SectionCard title="公司财务概览" description={`Company Financial Overview · ${periodLabel(data, effectivePeriod)} · 按营收排序 · 点击公司名进入财报速览`} className="xl:col-span-3">
              <CompanyOverviewTable rows={rows} />
            </SectionCard>
            <SectionCard title="近期告警" description="Recent Alerts · 规则引擎基于最新报告期评估" className="xl:col-span-2">
              <RecentAlerts alerts={activeAlerts.slice(0, 6)} />
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
