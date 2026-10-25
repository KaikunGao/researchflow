import { Badge } from "@/components/ui/badge";
import type { AlertSeverity, AlertStatus, DatasetOut, ReportOut } from "@/types/api";
import { cn } from "@/lib/utils";

const SEVERITY: Record<AlertSeverity, { label: string; className: string }> = {
  high: { label: "高", className: "bg-negative/10 text-negative border-negative/20" },
  medium: { label: "中", className: "bg-warning/15 text-amber-800 border-warning/30" },
  low: { label: "低", className: "bg-muted text-muted-foreground border-border" },
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const s = SEVERITY[severity];
  return (
    <Badge variant="outline" className={cn("font-medium", s.className)}>
      {s.label}
    </Badge>
  );
}

const ALERT_STATUS: Record<AlertStatus, { label: string; className: string }> = {
  active: { label: "活跃", className: "bg-negative/10 text-negative border-negative/20" },
  acknowledged: { label: "已确认", className: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "已解除", className: "bg-positive/10 text-positive border-positive/20" },
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const s = ALERT_STATUS[status];
  return (
    <Badge variant="outline" className={cn("font-medium", s.className)}>
      {s.label}
    </Badge>
  );
}

const DATASET_STATUS: Record<DatasetOut["status"], { label: string; dot: string }> = {
  ready: { label: "已就绪", dot: "bg-positive" },
  processing: { label: "处理中", dot: "bg-primary animate-pulse" },
  failed: { label: "失败", dot: "bg-negative" },
  pending: { label: "待处理", dot: "bg-muted-foreground/60" },
};

export function DatasetStatusBadge({ status }: { status: DatasetOut["status"] }) {
  const s = DATASET_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={cn("size-2 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

const REPORT_STATUS: Record<ReportOut["status"], { label: string; className: string }> = {
  completed: { label: "已完成", className: "bg-positive/10 text-positive border-positive/20" },
  failed: { label: "失败", className: "bg-negative/10 text-negative border-negative/20" },
};

export function ReportStatusBadge({ status }: { status: ReportOut["status"] }) {
  const s = REPORT_STATUS[status];
  return (
    <Badge variant="outline" className={cn("font-medium", s.className)}>
      {s.label}
    </Badge>
  );
}
