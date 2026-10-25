"use client";

import { CloudDownload, Download, FlaskConical, Loader2, RefreshCw, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatasetsTable } from "@/components/data/datasets-table";
import { ImportResultCard } from "@/components/data/import-result-card";
import { UploadDropzone } from "@/components/data/upload-dropzone";
import { PageHeader } from "@/components/layout/page-header";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { DatasetStatusBadge } from "@/components/shared/status-badge";
import { SelectField } from "@/components/shared/filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  SAMPLE_FILE_URL,
  deleteDataset,
  fetchPublicData,
  importSampleDataset,
  listDatasets,
  uploadDataset,
  worksheetExportUrl,
} from "@/lib/api";
import type { DatasetOut, ImportResult } from "@/types/api";

const STATUS_ORDER: DatasetOut["status"][] = ["ready", "processing", "pending", "failed"];
const DEFAULT_CODES = "600276.SH, 300760.SZ, 603259.SH, 600436.SH, 300015.SZ, 000661.SZ";
const YEAR_OPTIONS = ["2018", "2019", "2020", "2021", "2022", "2023"].map((y) => ({ value: y, label: `${y} 年起` }));

function parseCodes(text: string): string[] {
  return Array.from(new Set(text.split(/[\s,，;；、]+/).map((c) => c.trim()).filter(Boolean)));
}
const STATUS_LABEL: Record<DatasetOut["status"], string> = {
  ready: "已就绪",
  processing: "处理中",
  pending: "待处理",
  failed: "失败",
};

function errorMessage(err: unknown): string {
  return err instanceof ApiError || err instanceof Error ? err.message : "操作失败";
}

export function DataManagementView() {
  const [datasets, setDatasets] = useState<DatasetOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [codesText, setCodesText] = useState(DEFAULT_CODES);
  const [startYear, setStartYear] = useState("2020");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codes = parseCodes(codesText);

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listDatasets()
      .then((list) => {
        if (cancelled) return;
        setDatasets(list);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const refresh = useCallback(async () => {
    try {
      const list = await listDatasets();
      setDatasets(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  function handleManualRefresh() {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }

  const statusCounts = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, count: datasets.filter((d) => d.status === status).length })),
    [datasets],
  );

  async function runImport(task: () => Promise<ImportResult>) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const imported = await task();
      setResult(imported);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(dataset: DatasetOut) {
    if (!window.confirm(`删除数据集「${dataset.name}」？由该文件导入的财务记录会一并删除。`)) return;
    setDeletingId(dataset.id);
    try {
      await deleteDataset(dataset.id);
      setResult(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Data Management"
        title="数据管理"
        description="导入 Wind / Choice 导出的财务数据，自动完成字段映射、单位标准化与报告期识别。"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runImport(() => uploadDataset(file));
                e.target.value = "";
              }}
            />
            <Button variant="outline" nativeButton={false} render={<a href={worksheetExportUrl()} />} disabled={datasets.length === 0}>
              <Download className="size-4" />
              导出全部底表
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
              <Upload className="size-4" />
              Import Data
            </Button>
          </>
        }
      />

      {loadError && <PhaseNotice tone="warning" message={`无法读取数据集列表：${loadError}`} />}
      {error && <PhaseNotice tone="warning" message={`导入失败：${error}`} />}
      {result && <ImportResultCard result={result} />}

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="上传财务数据"
          description="支持 Wind 财务报表宽表（报告期横向）与一行一期的长表"
          className="xl:col-span-2"
          actions={
            <>
              <Button variant="ghost" size="sm" nativeButton={false} render={<a href={SAMPLE_FILE_URL} />}>
                <Download className="size-3.5" />
                下载示例文件
              </Button>
              <Button variant="outline" size="sm" onClick={() => void runImport(importSampleDataset)} disabled={busy}>
                <FlaskConical className="size-3.5" />
                导入示例文件
              </Button>
            </>
          }
        >
          <UploadDropzone busy={busy} onFileSelected={(file) => void runImport(() => uploadDataset(file))} />
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-2.5">
              <div className="font-medium text-foreground">1. 字段识别</div>
              识别证券代码、报告期列，把营业收入、归母净利润、销售费用等科目映射到标准字段
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5">
              <div className="font-medium text-foreground">2. 单位标准化</div>
              根据「单位：万元」或科目括号里的单位统一换算为亿元，处理千分位与 “--” 空值
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5">
              <div className="font-medium text-foreground">3. 入库与覆盖</div>
              写入 SQLite 事实表；同一公司、报告期、科目重复导入时以最新文件为准
            </div>
          </div>
        </SectionCard>

        <SectionCard title="数据集状态" description="Dataset Status · 按处理状态统计">
          <div className="grid grid-cols-2 gap-2">
            {statusCounts.map(({ status, count }) => (
              <Card key={status} className="gap-0 py-3 shadow-none">
                <CardContent className="px-3">
                  <DatasetStatusBadge status={status} />
                  <div className="mt-1 text-xl font-semibold tabular">{count}</div>
                  <div className="text-[11px] text-muted-foreground">{STATUS_LABEL[status]}数据集</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            本阶段导入为同步解析，成功即「已就绪」，解析失败不会写入数据库。处理中 / 待处理状态为后续异步导入预留。
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="从公开数据源拉取"
        description="无需 Wind 权限：按证券代码从东方财富 F10 获取利润表、资产负债表、现金流量表（累计口径），走同一套标准化流程"
        actions={
          <Button onClick={() => void runImport(() => fetchPublicData(codes, Number(startYear)))} disabled={busy || codes.length === 0}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CloudDownload className="size-4" />}
            拉取并导入
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <Label htmlFor="public-codes" className="mb-1.5 text-xs text-muted-foreground">证券代码（逗号或空格分隔，最多 20 家）</Label>
            <Input id="public-codes" value={codesText} onChange={(e) => setCodesText(e.target.value)} placeholder="600276.SH, 300760.SZ" className="font-mono text-xs" disabled={busy} />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-foreground">起始年份</Label>
            <SelectField value={startYear} onChange={setStartYear} options={YEAR_OPTIONS} ariaLabel="起始年份" disabled={busy} />
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          已识别 {codes.length} 个代码。每家公司约需 5–15 秒；数据来自东方财富公开接口，与上市公司定期报告披露值一致（已用恒瑞医药 2023 / 2024 年报核对），仍建议在发布前对照公告复核。
        </p>
      </SectionCard>

      <SectionCard
        title="最近数据集"
        description="Recent Datasets · 已导入的财务数据文件"
        actions={
          <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={loading}>
            <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
            刷新
          </Button>
        }
      >
        <DatasetsTable datasets={datasets} onDelete={(d) => void handleDelete(d)} deletingId={deletingId} />
      </SectionCard>
    </div>
  );
}
