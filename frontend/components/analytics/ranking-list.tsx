import { DeltaText } from "@/components/shared/delta-text";
import { formatMetric, isGrowthMetric, type RankingRow } from "@/lib/panel";
import type { PanelMetric } from "@/types/api";
import { cn } from "@/lib/utils";

interface RankingListProps {
  rows: RankingRow[];
  metric: PanelMetric;
}

export function RankingList({ rows, metric }: RankingListProps) {
  const values = rows.map((r) => r.value).filter((v): v is number => v !== null);
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const deltaSuffix = metric.unit === "%" || metric.unit === "pct" ? "pp" : "";

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => {
        const width = row.value !== null ? Math.max(4, (Math.abs(row.value) / maxAbs) * 100) : 0;
        const negative = row.value !== null && row.value < 0;
        return (
          <li key={row.company.code} className="flex items-center gap-3">
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold tabular", row.rank <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">
                  {row.company.name}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">{row.company.code}</span>
                </span>
                <span className="shrink-0 tabular">{formatMetric(row.value, metric, isGrowthMetric(metric))}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", negative ? "bg-negative/70" : "bg-primary/80")} style={{ width: `${width}%` }} />
                </div>
                <DeltaText value={row.delta} suffix={deltaSuffix} higherIsBetter={metric.higher_is_better} className="w-16 justify-end" />
              </div>
            </div>
          </li>
        );
      })}
      {rows.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">没有可排名的数据</li>}
    </ol>
  );
}
