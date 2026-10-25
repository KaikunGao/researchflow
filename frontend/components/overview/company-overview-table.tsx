import Link from "next/link";
import { DeltaText } from "@/components/shared/delta-text";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent, formatYi } from "@/lib/format";
import type { NumberOrNull, PanelCompany } from "@/types/api";

export interface OverviewRow {
  company: PanelCompany;
  period: string | null;
  revenue: NumberOrNull;
  revenueYoy: NumberOrNull;
  netProfit: NumberOrNull;
  netProfitYoy: NumberOrNull;
  netMargin: NumberOrNull;
  roe: NumberOrNull;
  activeAlerts: number;
}

export function CompanyOverviewTable({ rows }: { rows: OverviewRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="w-[200px]">公司</TableHead>
            <TableHead>子行业</TableHead>
            <TableHead className="text-right">营收（亿元）</TableHead>
            <TableHead className="text-right">营收同比</TableHead>
            <TableHead className="text-right">归母净利润</TableHead>
            <TableHead className="text-right">净利同比</TableHead>
            <TableHead className="text-right">净利率</TableHead>
            <TableHead className="text-right">ROE</TableHead>
            <TableHead className="text-right">活跃告警</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.company.code} className="text-sm">
              <TableCell>
                <Link href={`/snapshot?code=${encodeURIComponent(r.company.code)}`} className="font-medium hover:text-primary hover:underline">
                  {r.company.name}
                </Link>
                <div className="font-mono text-[11px] text-muted-foreground">{r.company.code}</div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.company.sub_industry_label}</TableCell>
              <TableCell className="text-right tabular">{r.revenue !== null ? formatYi(r.revenue, false) : "—"}</TableCell>
              <TableCell className="text-right"><DeltaText value={r.revenueYoy} suffix="%" /></TableCell>
              <TableCell className="text-right tabular">{r.netProfit !== null ? formatYi(r.netProfit, false) : "—"}</TableCell>
              <TableCell className="text-right"><DeltaText value={r.netProfitYoy} suffix="%" /></TableCell>
              <TableCell className="text-right tabular">{r.netMargin !== null ? formatPercent(r.netMargin) : "—"}</TableCell>
              <TableCell className="text-right tabular">{r.roe !== null ? formatPercent(r.roe) : "—"}</TableCell>
              <TableCell className="text-right">
                {r.activeAlerts > 0 ? (
                  <Link href="/alerts">
                    <Badge variant="outline" className="border-negative/30 bg-negative/10 text-negative">{r.activeAlerts}</Badge>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                当前筛选条件下没有公司数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
