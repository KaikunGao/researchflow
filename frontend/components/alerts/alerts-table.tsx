import { Check, RotateCcw, ShieldCheck } from "lucide-react";
import { AlertStatusBadge, SeverityBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AlertOut, AlertStatus } from "@/types/api";

interface AlertsTableProps {
  alerts: AlertOut[];
  metricLabels: Record<string, string>;
  periodLabels: Record<string, string>;
  onStatusChange: (alert: AlertOut, status: AlertStatus) => void;
  busyId?: string | null;
  showResolved?: boolean;
  emptyText?: string;
}

export function AlertsTable({ alerts, metricLabels, periodLabels, onStatusChange, busyId, showResolved = false, emptyText = "暂无告警" }: AlertsTableProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[72px]">严重度</TableHead>
            <TableHead className="w-[150px]">公司</TableHead>
            <TableHead>告警内容</TableHead>
            <TableHead>指标</TableHead>
            <TableHead>报告期</TableHead>
            <TableHead>触发时间</TableHead>
            {showResolved && <TableHead>解除时间</TableHead>}
            <TableHead>状态</TableHead>
            <TableHead className="w-[150px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id} className="text-sm">
              <TableCell><SeverityBadge severity={alert.severity} /></TableCell>
              <TableCell>
                <div className="font-medium">{alert.company_name ?? alert.code}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{alert.code}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{alert.title}</div>
                <div className="max-w-md text-xs text-muted-foreground">{alert.description}</div>
              </TableCell>
              <TableCell className="text-xs">{metricLabels[alert.metric_key] ?? alert.metric_key}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{periodLabels[alert.period_end] ?? alert.period_end}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(alert.triggered_at)}</TableCell>
              {showResolved && <TableCell className="text-xs text-muted-foreground">{alert.resolved_at ? formatDateTime(alert.resolved_at) : "—"}</TableCell>}
              <TableCell><AlertStatusBadge status={alert.status} /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {alert.status === "active" && (
                    <Button variant="ghost" size="sm" disabled={busyId === alert.id} onClick={() => onStatusChange(alert, "acknowledged")}>
                      <Check className="size-3.5" /> 确认
                    </Button>
                  )}
                  {alert.status !== "resolved" && (
                    <Button variant="ghost" size="sm" disabled={busyId === alert.id} onClick={() => onStatusChange(alert, "resolved")}>
                      <ShieldCheck className="size-3.5" /> 解除
                    </Button>
                  )}
                  {alert.status === "resolved" && (
                    <Button variant="ghost" size="sm" disabled={busyId === alert.id} onClick={() => onStatusChange(alert, "active")}>
                      <RotateCcw className="size-3.5" /> 重新激活
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {alerts.length === 0 && (
            <TableRow>
              <TableCell colSpan={showResolved ? 9 : 8} className="py-8 text-center text-sm text-muted-foreground">{emptyText}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
