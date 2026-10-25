import { Download, FileText, Trash } from "lucide-react";
import { ReportStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reportDownloadUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ReportOut } from "@/types/api";

interface GeneratedReportsTableProps {
  reports: ReportOut[];
  companyNames: Record<string, string>;
  metricLabels: Record<string, string>;
  periodLabels: Record<string, string>;
  onDelete: (report: ReportOut) => void;
  busyId?: string | null;
}

export function GeneratedReportsTable({ reports, companyNames, metricLabels, periodLabels, onDelete, busyId }: GeneratedReportsTableProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[300px]">报告</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>覆盖公司</TableHead>
            <TableHead>指标</TableHead>
            <TableHead>报告期</TableHead>
            <TableHead>生成时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="w-[120px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const names = report.codes.map((c) => companyNames[c] ?? c);
            const companyText = names.length > 3 ? `${names.slice(0, 3).join("、")} 等 ${names.length} 家` : names.join("、");
            return (
              <TableRow key={report.id} className="text-sm">
                <TableCell>
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{report.title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{report.id} · .docx</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{report.report_type_label}</TableCell>
                <TableCell className="max-w-48 text-xs text-muted-foreground">{companyText}</TableCell>
                <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{report.metrics.map((m) => metricLabels[m] ?? m).join(" / ")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{report.period_end ? (periodLabels[report.period_end] ?? report.period_end) : "各公司最新"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(report.created_at)}</TableCell>
                <TableCell><ReportStatusBadge status={report.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {report.status === "completed" && (
                      <Button variant="ghost" size="sm" nativeButton={false} render={<a href={reportDownloadUrl(report.id)} />}>
                        <Download className="size-3.5" /> 下载
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label={`删除报告 ${report.title}`} disabled={busyId === report.id} onClick={() => onDelete(report)}>
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {reports.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">尚未生成任何报告</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
