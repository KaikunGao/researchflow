import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { average, formatMetric, isGrowthMetric, quarterLabel, valueAt } from "@/lib/panel";
import type { AnalyticsPanel, PanelCompany, PanelMetric } from "@/types/api";
import { cn } from "@/lib/utils";

interface MetricDataTableProps {
  panel: AnalyticsPanel;
  companies: PanelCompany[];
  metric: PanelMetric;
  periods: string[];
  showSubIndustry?: boolean;
  showAverage?: boolean;
}

export function MetricDataTable({ panel, companies, metric, periods, showSubIndustry = true, showAverage = false }: MetricDataTableProps) {
  const signed = isGrowthMetric(metric);
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[180px]">公司</TableHead>
            {showSubIndustry && <TableHead>子行业</TableHead>}
            {periods.map((p) => (
              <TableHead key={p} className="text-right">{quarterLabel(panel, p)}</TableHead>
            ))}
            {showAverage && <TableHead className="text-right">区间均值</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const values = periods.map((p) => valueAt(panel, company.code, p, metric.key));
            const avg = average(values);
            return (
              <TableRow key={company.code} className="text-sm">
                <TableCell>
                  <div className="font-medium">{company.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{company.code}</div>
                </TableCell>
                {showSubIndustry && <TableCell className="text-xs text-muted-foreground">{company.sub_industry_label}</TableCell>}
                {values.map((v, i) => (
                  <TableCell key={periods[i]} className={cn("text-right tabular", v !== null && v < 0 && signed && "text-negative")}>
                    {formatMetric(v, metric, signed)}
                  </TableCell>
                ))}
                {showAverage && <TableCell className="text-right font-medium tabular">{formatMetric(avg, metric, signed)}</TableCell>}
              </TableRow>
            );
          })}
          {companies.length === 0 && (
            <TableRow>
              <TableCell colSpan={periods.length + 3} className="py-8 text-center text-sm text-muted-foreground">请至少选择一家公司</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
