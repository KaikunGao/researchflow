"use client";

import { Download, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyMultiSelect } from "@/components/comparison/company-multi-select";
import { PageHeader } from "@/components/layout/page-header";
import { GeneratedReportsTable } from "@/components/reports/generated-reports-table";
import { EmptyDataState } from "@/components/shared/empty-data-state";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { errorMessage, useAsync } from "@/hooks/use-async";
import { usePanel } from "@/hooks/use-panel";
import { createReport, deleteReport, listReports, reportDownloadUrl } from "@/lib/api";
import { periodLabel } from "@/lib/panel";
import type { ReportOut, ReportType } from "@/types/api";

const REPORT_TYPES: { value: ReportType; label: string; description: string; minCompanies: number; maxCompanies: number }[] = [
  { value: "company_deep_dive", label: "公司深度", description: "单家公司：点评段落、分季度数据表、四张标准图、历史指标一览。", minCompanies: 1, maxCompanies: 1 },
  { value: "peer_comparison", label: "同业对比", description: "多家公司在选定指标上的最新报告期对比、排名、对比图与历史表。", minCompanies: 2, maxCompanies: 10 },
  { value: "periodic_update", label: "定期跟踪", description: "财报发布后的逐家更新：每家公司最新报告期点评 + 核心数据表 + 活跃告警。", minCompanies: 1, maxCompanies: 20 },
  { value: "industry_overview", label: "行业综述", description: "板块整体与子行业均值、公司一览、增速前后五名、活跃告警（不选公司则覆盖全部）。", minCompanies: 0, maxCompanies: 50 },
];

const DEFAULT_METRICS = ["revenue", "revenue_yoy", "net_profit", "net_profit_yoy", "gross_margin", "net_margin", "selling_ratio", "rd_ratio"];
const METRIC_GROUPS_FOR_REPORT = ["规模", "成长", "盈利", "费用", "资产质量"];

export function ReportGeneratorView() {
  const panel = usePanel();
  const reports = useAsync(listReports);
  const data = panel.data;
  const [reportType, setReportType] = useState<ReportType>("company_deep_dive");
  const [codesState, setCodes] = useState<string[] | null>(null);
  const [period, setPeriod] = useState<string>("latest");
  const [metrics, setMetrics] = useState<string[]>(DEFAULT_METRICS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<ReportOut | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const codes = useMemo(() => {
    if (!data) return [];
    if (codesState === null) return data.companies.slice(0, 1).map((c) => c.code);
    return codesState.filter((c) => data.companies.some((x) => x.code === c));
  }, [data, codesState]);

  const typeDef = REPORT_TYPES.find((t) => t.value === reportType)!;
  const companyNames = useMemo(() => Object.fromEntries((data?.companies ?? []).map((c) => [c.code, c.name])), [data]);
  const metricLabels = useMemo(() => Object.fromEntries((data?.metrics ?? []).map((m) => [m.key, m.label])), [data]);
  const periodOptions = useMemo(
    () => [{ value: "latest", label: "各公司最新报告期" }, ...(data ? [...data.periods].reverse().map((p) => ({ value: p, label: periodLabel(data, p) })) : [])],
    [data],
  );
  const metricChoices = useMemo(() => (data?.metrics ?? []).filter((m) => METRIC_GROUPS_FOR_REPORT.includes(m.group) && !m.key.endsWith("_single") && !m.key.includes("qoq")), [data]);

  const companyCountOk = codes.length >= typeDef.minCompanies && codes.length <= typeDef.maxCompanies;
  const canSubmit = companyCountOk && (reportType === "industry_overview" || metrics.length > 0) && !generating;

  function toggleMetric(key: string, checked: boolean) {
    setMetrics((prev) => (checked ? [...prev, key] : prev.filter((m) => m !== key)));
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setLastReport(null);
    try {
      const report = await createReport({ report_type: reportType, codes, period_end: period === "latest" ? null : period, metrics });
      setLastReport(report);
      reports.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(report: ReportOut) {
    if (!window.confirm(`删除报告「${report.title}」？`)) return;
    setBusyId(report.id);
    try {
      await deleteReport(report.id);
      if (lastReport?.id === report.id) setLastReport(null);
      reports.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Report Generator" title="报告生成" description="基于标准化财务数据生成 Word 研究报告初稿，图表、表格与数据段落自动完成，研究员只需补充观点。" />

      {panel.error && <PhaseNotice tone="warning" message={`无法加载分析数据：${panel.error}`} />}
      {error && <PhaseNotice tone="warning" message={`生成失败：${error}`} />}
      {lastReport && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-positive/30 bg-positive/5 px-4 py-3 text-sm">
          <span>已生成：<span className="font-medium">{lastReport.title}</span>（Word 文档）</span>
          <Button size="sm" nativeButton={false} render={<a href={reportDownloadUrl(lastReport.id)} />}>
            <Download className="size-3.5" /> 下载 .docx
          </Button>
        </div>
      )}
      {data && data.companies.length === 0 && <EmptyDataState onImported={panel.reload} />}

      {data && data.companies.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <SectionCard title="报告配置" description="Report Type · Reporting Period">
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-foreground">报告类型 Report Type</Label>
                  <SelectField<ReportType> value={reportType} onChange={setReportType} options={REPORT_TYPES.map((t) => ({ value: t.value, label: t.label }))} ariaLabel="报告类型" className="[&>button]:w-full" />
                  <p className="mt-1.5 text-xs text-muted-foreground">{typeDef.description}</p>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs text-muted-foreground">报告期 Reporting Period</Label>
                  <SelectField value={period} onChange={setPeriod} options={periodOptions} ariaLabel="报告期" className="[&>button]:w-full" />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="包含指标" description={`Included Metrics · 已选 ${metrics.length} 项（行业综述固定使用核心指标）`}>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {metricChoices.map((m) => {
                  const id = `rpt-metric-${m.key}`;
                  return (
                    <Label key={m.key} htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-normal hover:bg-muted/60">
                      <Checkbox id={id} checked={metrics.includes(m.key)} onCheckedChange={(v) => toggleMetric(m.key, v === true)} />
                      <span className="truncate">{m.label}</span>
                    </Label>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-4 xl:col-span-3">
            <SectionCard
              title="选择公司"
              description={`Company Selection · 已选 ${codes.length} 家 · ${typeDef.label}需要 ${typeDef.minCompanies === typeDef.maxCompanies ? typeDef.minCompanies : `${typeDef.minCompanies}–${typeDef.maxCompanies}`} 家`}
              actions={
                <Button onClick={() => void generate()} disabled={!canSubmit}>
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Generate Report
                </Button>
              }
            >
              <CompanyMultiSelect companies={data.companies} selected={codes} onChange={setCodes} max={typeDef.maxCompanies} idPrefix="rpt" />
              {!companyCountOk && <p className="mt-2 text-xs text-amber-700">当前报告类型需要 {typeDef.minCompanies === typeDef.maxCompanies ? typeDef.minCompanies : `${typeDef.minCompanies}–${typeDef.maxCompanies}`} 家公司。</p>}
            </SectionCard>
          </div>
        </div>
      )}

      <SectionCard title="已生成报告" description="Generated Reports · Word 文档保存在后端 data/reports 目录">
        <GeneratedReportsTable reports={reports.data ?? []} companyNames={companyNames} metricLabels={metricLabels} periodLabels={data?.period_labels ?? {}} onDelete={(r) => void handleDelete(r)} busyId={busyId} />
      </SectionCard>
    </div>
  );
}
