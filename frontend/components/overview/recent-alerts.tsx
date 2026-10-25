import Link from "next/link";
import { ArrowRight, BellOff } from "lucide-react";
import { SeverityBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";
import type { AlertOut } from "@/types/api";

export function RecentAlerts({ alerts }: { alerts: AlertOut[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <BellOff className="size-5" />
        当前筛选范围内没有活跃告警
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="divide-y">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start gap-3 py-2.5 first:pt-0">
            <SeverityBadge severity={alert.severity} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {alert.company_name ?? alert.code}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{alert.code}</span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(alert.triggered_at)}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground">{alert.title} · {alert.description}</div>
            </div>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="mt-2 self-end" nativeButton={false} render={<Link href="/alerts" />}>
        查看全部告警
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}
