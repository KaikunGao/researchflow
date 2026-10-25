import { FileSpreadsheet, Trash } from "lucide-react";
import { DatasetStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatFileSize, formatInteger } from "@/lib/format";
import type { DatasetOut } from "@/types/api";

interface DatasetsTableProps {
  datasets: DatasetOut[];
  onDelete: (dataset: DatasetOut) => void;
  deletingId?: string | null;
}

const LAYOUT_LABEL: Record<string, string> = {
  wide: "宽表（报告期横向）",
  long: "长表（一行一期）",
  mixed: "混合布局",
  public_api: "公开数据源（东方财富）",
  unknown: "未知",
};

export function DatasetsTable({ datasets, onDelete, deletingId }: DatasetsTableProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[300px]">数据集</TableHead>
            <TableHead>布局</TableHead>
            <TableHead>覆盖范围</TableHead>
            <TableHead className="text-right">记录数</TableHead>
            <TableHead className="text-right">大小</TableHead>
            <TableHead>导入时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets.map((ds) => (
            <TableRow key={ds.id} className="text-sm">
              <TableCell>
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{ds.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{ds.file_name}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{LAYOUT_LABEL[ds.layout] ?? ds.layout}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {ds.company_count} 家公司 · {ds.period_count} 个报告期
              </TableCell>
              <TableCell className="text-right tabular">{formatInteger(ds.fact_count)}</TableCell>
              <TableCell className="text-right tabular">{formatFileSize(ds.size_kb)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(ds.created_at)}</TableCell>
              <TableCell>
                <DatasetStatusBadge status={ds.status} />
                {ds.warnings.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-amber-700">{ds.warnings.length} 条提示</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除数据集 ${ds.name}`}
                  disabled={deletingId === ds.id}
                  onClick={() => onDelete(ds)}
                >
                  <Trash className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {datasets.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                尚未导入任何数据集
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
