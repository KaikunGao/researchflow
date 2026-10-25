import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/types/api";

export function ImportResultCard({ result }: { result: ImportResult }) {
  const { dataset } = result;
  return (
    <div className="rounded-lg border border-positive/30 bg-positive/5 p-4">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-positive" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">导入完成：{dataset.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{dataset.company_count} 家公司</span>
            <span>{dataset.period_count} 个报告期（{result.periods[0]} – {result.periods[result.periods.length - 1]}）</span>
            <span>{dataset.fact_count} 条标准化记录</span>
            <span>布局：{dataset.layout}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {result.companies.map((c) => (
              <Badge key={c} variant="secondary" className="font-normal">
                {c}
              </Badge>
            ))}
          </div>
          {dataset.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {dataset.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-xs text-amber-800">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button size="sm" nativeButton={false} render={<Link href="/snapshot" />}>
              前往财报速览
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
