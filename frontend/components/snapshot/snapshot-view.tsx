"use client";

import Link from "next/link";
import { Database, Download, FlaskConical, Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DeltaText } from "@/components/shared/delta-text";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { CommentaryCard } from "@/components/snapshot/commentary-card";
import { QuarterTable } from "@/components/snapshot/quarter-table";
import {
  BarLineChart,
  ChartCard,
  MultiLineChart,
  SNAPSHOT_COLORS,
  type BarLinePoint,
  type LinePoint,
} from "@/components/snapshot/snapshot-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sourceLine, useSettings } from "@/hooks/use-settings";
import { ApiError, fetchSnapshot, importSampleDataset, listCompanies, worksheetExportUrl } from "@/lib/api";
import type { CompanyOut, CompanySnapshot, PeriodMetrics } from "@/types/api";
import { cn } from "@/lib/utils";

type Basis = "single" | "cumulative";

function errorMessage(err: unknown): string {
  return err instanceof ApiError || err instanceof Error ? err.message : "加载失败";
}

export function SnapshotView() {
  const searchParams = useSearchParams();
  const requestedCode = searchParams.get("code") ?? "";
  const settings = useSettings();
  const [companies, setCompanies] = useState<CompanyOut[] | null>(null);
  const [code, setCode] = useState<string>(requestedCode);
  const [period, setPeriod] = useState<string>("");
  const [snapshot, setSnapshot] = useState<CompanySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basisOverride, setBasisOverride] = useState<Basis | null>(null);
  const basis: Basis = basisOverride ?? settings.data?.default_basis ?? "single";
  const chartWindow = Number(settings.data?.chart_window ?? "8") || 8;
  const source = sourceLine(settings.data);
  const [importing, setImporting] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // 加载已导入的公司列表
  useEffect(() => {
    let cancelled = false;
    listCompanies()
      .then((list) => {
        if (cancelled) return;
        setCompanies(list);
        setError(null);
        setCode((prev) => (prev && list.some((c) => c.code === prev) ? prev : (list[0]?.code ?? "")));
      })
      .catch((err) => {
        if (cancelled) return;
        setCompanies([]);
        setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // 公司或报告期变化时重新获取速览
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetchSnapshot(code, period || undefined)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setPeriod(data.period.period_end);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [code, period]);

  // 派生的加载状态：当前展示的数据与选择不一致时视为加载中
  const loading =
    !!code && (!snapshot || snapshot.company.code !== code || (period !== "" && snapshot.period.period_end !== period));

  async function handleImportSample() {
    setImporting(true);
    try {
      await importSampleDataset();
      setReloadTick((t) => t + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  const companyOptions = useMemo(
    () => (companies ?? []).map((c) => ({ value: c.code, label: `${c.name} ${c.code}` })),
    [companies],
  );
  const periodOptions = useMemo(
    () => (snapshot ? [...snapshot.series].reverse().map((m) => ({ value: m.period_end, label: m.label })) : []),
    [snapshot],
  );

  const chartSeries = useMemo(() => {
    if (!snapshot) return [];
    const idx = snapshot.series.findIndex((m) => m.period_end === snapshot.period.period_end);
    const end = idx >= 0 ? idx + 1 : snapshot.series.length;
    return snapshot.series.slice(Math.max(0, end - chartWindow), end);
  }, [snapshot, chartWindow]);

  const revenueData = useMemo(() => toBarLine(chartSeries, "revenue", basis), [chartSeries, basis]);
  const profitData = useMemo(() => toBarLine(chartSeries, "net_profit", basis), [chartSeries, basis]);
  const marginData = useMemo(() => toLines(chartSeries, basis, ["gross_margin", "net_margin", "deducted_net_margin"]), [chartSeries, basis]);
  const expenseData = useMemo(() => toLines(chartSeries, basis, ["selling_ratio", "admin_ratio", "rd_ratio", "finance_ratio"]), [chartSeries, basis]);

  const basisLabel = basis === "single" ? "单季度" : "累计";

  if (companies === null) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Earnings Snapshot" title="财报速览" description="正在加载已导入的公司…" />
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Earnings Snapshot"
          title="财报速览"
          description="导入财报数据后，自动完成单季度拆分、点评数据段落与标准图表。"
        />
        {error && <PhaseNotice tone="warning" message={error} />}
        <Card className="py-10">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Database className="size-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">尚未导入任何公司数据</div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                先在「数据管理」导入 Wind / Choice 导出的财务数据，或直接导入内置的示例文件体验完整流程。
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => void handleImportSample()} disabled={importing}>
                {importing ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
                导入示例文件
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/data" />}>
                前往数据管理
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const m = snapshot && snapshot.company.code === code ? snapshot.period : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Earnings Snapshot"
        title="财报速览"
        description="选择公司与报告期，一键得到单季度拆分、点评数据段落与四张标准图。"
        actions={
          <>
            <SelectField value={code} onChange={(v) => { setCode(v); setPeriod(""); }} options={companyOptions} label="公司" ariaLabel="公司选择器" />
            <SelectField value={period} onChange={setPeriod} options={periodOptions} label="报告期" ariaLabel="报告期选择器" />
            <Button variant="outline" nativeButton={false} render={<a href={worksheetExportUrl([code])} />}>
              <Download className="size-4" />
              导出底表 Excel
            </Button>
          </>
        }
      />

      {error && <PhaseNotice tone="warning" message={error} />}

      {m && snapshot && snapshot.company.code === code && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi label="营业收入（累计）" value={yi(m.cumulative.revenue)} delta={m.yoy_cumulative.revenue} deltaLabel="同比" />
            <Kpi label="归母净利润（累计）" value={yi(m.cumulative.net_profit)} delta={m.yoy_cumulative.net_profit} deltaLabel="同比" />
            <Kpi label={`${m.quarter_label} 单季营收`} value={yi(m.single.revenue)} delta={m.yoy_single.revenue} deltaLabel="同比" delta2={m.qoq_single.revenue} delta2Label="环比" />
            <Kpi label={`${m.quarter_label} 单季净利润`} value={yi(m.single.net_profit)} delta={m.yoy_single.net_profit} deltaLabel="同比" delta2={m.qoq_single.net_profit} delta2Label="环比" />
            <Kpi label="毛利率（累计）" value={pct(m.ratios_cumulative.gross_margin)} delta={m.ratio_change_cumulative.gross_margin} deltaLabel="同比" suffix="pct" />
            <Kpi label="销售费用率（累计）" value={pct(m.ratios_cumulative.selling_ratio)} delta={m.ratio_change_cumulative.selling_ratio} deltaLabel="同比" suffix="pct" higherIsBetter={false} />
          </div>

          <CommentaryCard text={snapshot.commentary} methodology={snapshot.methodology} periodLabel={`${snapshot.company.name} ${m.label}`} />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              标准图表
              <span className="ml-2 text-xs font-normal text-muted-foreground">最近 {chartSeries.length} 个报告期 · 截至 {m.label}</span>
            </div>
            <Tabs value={basis} onValueChange={(v) => setBasisOverride(v as Basis)}>
              <TabsList>
                <TabsTrigger value="single">单季度</TabsTrigger>
                <TabsTrigger value="cumulative">累计</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className={cn("grid gap-4 xl:grid-cols-2", loading && "opacity-60")}>
            <ChartCard
              title={`${snapshot.company.name}：${basisLabel}营业收入及同比增速`}
              subtitle={`亿元 / % · ${chartSeries[0]?.quarter_label ?? ""} – ${m.quarter_label}`}
              fileName={`${snapshot.company.name}_${basisLabel}营收及增速_${m.period_end}`}
              legend={[{ label: "营业收入（亿元）", color: SNAPSHOT_COLORS.navy }, { label: "同比增速（%）", color: SNAPSHOT_COLORS.amber, shape: "line" }]}
              source={source}
            >
              <BarLineChart data={revenueData} valueName="营业收入（亿元）" growthName="同比增速（%）" />
            </ChartCard>
            <ChartCard
              title={`${snapshot.company.name}：${basisLabel}归母净利润及同比增速`}
              subtitle={`亿元 / % · ${chartSeries[0]?.quarter_label ?? ""} – ${m.quarter_label}`}
              fileName={`${snapshot.company.name}_${basisLabel}净利润及增速_${m.period_end}`}
              legend={[{ label: "归母净利润（亿元）", color: SNAPSHOT_COLORS.navy }, { label: "同比增速（%）", color: SNAPSHOT_COLORS.amber, shape: "line" }]}
              source={source}
            >
              <BarLineChart data={profitData} valueName="归母净利润（亿元）" growthName="同比增速（%）" />
            </ChartCard>
            <ChartCard
              title={`${snapshot.company.name}：${basisLabel}毛利率与净利率`}
              subtitle={`% · ${chartSeries[0]?.quarter_label ?? ""} – ${m.quarter_label}`}
              fileName={`${snapshot.company.name}_${basisLabel}利润率_${m.period_end}`}
              legend={MARGIN_SERIES.map((s) => ({ label: s.name, color: s.color, shape: "line" as const }))}
              source={source}
            >
              <MultiLineChart data={marginData} series={MARGIN_SERIES} />
            </ChartCard>
            <ChartCard
              title={`${snapshot.company.name}：${basisLabel}期间费用率`}
              subtitle={`% · ${chartSeries[0]?.quarter_label ?? ""} – ${m.quarter_label}`}
              fileName={`${snapshot.company.name}_${basisLabel}费用率_${m.period_end}`}
              legend={EXPENSE_SERIES.map((s) => ({ label: s.name, color: s.color, shape: "line" as const }))}
              source={source}
            >
              <MultiLineChart data={expenseData} series={EXPENSE_SERIES} />
            </ChartCard>
          </div>

          <SectionCard
            title="季度明细"
            description="累计口径与单季度拆分结果 · 单季度 = 本期累计 − 上期累计，缺少上期数据时留空"
            actions={
              loading ? <RefreshCw className="size-3.5 animate-spin text-muted-foreground" /> : null
            }
          >
            <QuarterTable series={snapshot.series} highlightPeriod={m.period_end} />
          </SectionCard>
        </>
      )}
    </div>
  );
}

const MARGIN_SERIES = [
  { key: "gross_margin", name: "毛利率", color: SNAPSHOT_COLORS.navy },
  { key: "net_margin", name: "净利率", color: SNAPSHOT_COLORS.teal },
  { key: "deducted_net_margin", name: "扣非净利率", color: SNAPSHOT_COLORS.violet },
];

const EXPENSE_SERIES = [
  { key: "selling_ratio", name: "销售费用率", color: SNAPSHOT_COLORS.navy },
  { key: "admin_ratio", name: "管理费用率", color: SNAPSHOT_COLORS.teal },
  { key: "rd_ratio", name: "研发费用率", color: SNAPSHOT_COLORS.amber },
  { key: "finance_ratio", name: "财务费用率", color: SNAPSHOT_COLORS.slate },
];

function toBarLine(series: PeriodMetrics[], field: string, basis: Basis): BarLinePoint[] {
  return series.map((m) => ({
    label: basis === "single" ? m.quarter_label : m.label.replace(" 年", "年"),
    value: round(basis === "single" ? m.single[field] : m.cumulative[field]),
    growth: round(basis === "single" ? m.yoy_single[field] : m.yoy_cumulative[field]),
  }));
}

function toLines(series: PeriodMetrics[], basis: Basis, keys: string[]): LinePoint[] {
  return series.map((m) => {
    const source = basis === "single" ? m.ratios_single : m.ratios_cumulative;
    const point: LinePoint = { label: basis === "single" ? m.quarter_label : m.label.replace(" 年", "年") };
    for (const key of keys) point[key] = round(source[key]);
    return point;
  });
}

function round(value: number | null | undefined, digits = 2): number | null {
  if (value === null || value === undefined) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function yi(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)} 亿`;
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

interface KpiProps {
  label: string;
  value: string;
  delta: number | null | undefined;
  deltaLabel: string;
  delta2?: number | null;
  delta2Label?: string;
  suffix?: string;
  higherIsBetter?: boolean;
}

function Kpi({ label, value, delta, deltaLabel, delta2, delta2Label, suffix = "%", higherIsBetter = true }: KpiProps) {
  return (
    <Card className="gap-0 py-3">
      <CardContent className="px-3">
        <div className="truncate text-[11px] font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold tracking-tight tabular">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {deltaLabel}
            <DeltaText value={delta ?? null} suffix={suffix} higherIsBetter={higherIsBetter} />
          </span>
          {delta2Label && (
            <span className="inline-flex items-center gap-1">
              {delta2Label}
              <DeltaText value={delta2 ?? null} suffix={suffix} higherIsBetter={higherIsBetter} />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
