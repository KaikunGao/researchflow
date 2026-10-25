import { DeltaText } from "@/components/shared/delta-text";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PeriodMetrics } from "@/types/api";
import { cn } from "@/lib/utils";

function yi(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : value.toFixed(2);
}

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

interface QuarterTableProps {
  series: PeriodMetrics[];
  highlightPeriod: string;
}

/** 按报告期列出累计与单季度核心数据，最新在前 */
export function QuarterTable({ series, highlightPeriod }: QuarterTableProps) {
  const rows = [...series].reverse();
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead rowSpan={2} className="align-bottom">报告期</TableHead>
            <TableHead colSpan={3} className="border-b text-center">累计口径（亿元）</TableHead>
            <TableHead colSpan={5} className="border-b text-center">单季度（亿元）</TableHead>
            <TableHead colSpan={3} className="border-b text-center">单季度比率</TableHead>
          </TableRow>
          <TableRow className="text-xs">
            <TableHead className="text-right">营收</TableHead>
            <TableHead className="text-right">同比</TableHead>
            <TableHead className="text-right">归母净利</TableHead>
            <TableHead className="text-right">营收</TableHead>
            <TableHead className="text-right">同比</TableHead>
            <TableHead className="text-right">环比</TableHead>
            <TableHead className="text-right">归母净利</TableHead>
            <TableHead className="text-right">同比</TableHead>
            <TableHead className="text-right">毛利率</TableHead>
            <TableHead className="text-right">净利率</TableHead>
            <TableHead className="text-right">销售费用率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.period_end} className={cn("text-sm", m.period_end === highlightPeriod && "bg-primary/5")}>
              <TableCell>
                <div className="font-medium">{m.label}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{m.period_end}</div>
              </TableCell>
              <TableCell className="text-right tabular">{yi(m.cumulative.revenue)}</TableCell>
              <TableCell className="text-right"><DeltaText value={m.yoy_cumulative.revenue ?? null} suffix="%" /></TableCell>
              <TableCell className="text-right tabular">{yi(m.cumulative.net_profit)}</TableCell>
              <TableCell className="text-right tabular">{yi(m.single.revenue)}</TableCell>
              <TableCell className="text-right"><DeltaText value={m.yoy_single.revenue ?? null} suffix="%" /></TableCell>
              <TableCell className="text-right"><DeltaText value={m.qoq_single.revenue ?? null} suffix="%" /></TableCell>
              <TableCell className="text-right tabular">{yi(m.single.net_profit)}</TableCell>
              <TableCell className="text-right"><DeltaText value={m.yoy_single.net_profit ?? null} suffix="%" /></TableCell>
              <TableCell className="text-right tabular">{pct(m.ratios_single.gross_margin)}</TableCell>
              <TableCell className="text-right tabular">{pct(m.ratios_single.net_margin)}</TableCell>
              <TableCell className="text-right tabular">{pct(m.ratios_single.selling_ratio)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
