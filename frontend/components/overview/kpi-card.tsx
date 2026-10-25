import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  labelEn: string;
  value: string;
  icon: LucideIcon;
  footer?: ReactNode;
  tone?: "default" | "negative";
}

export function KpiCard({ label, labelEn, value, icon: Icon, footer, tone = "default" }: KpiCardProps) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{labelEn}</div>
          </div>
          <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </div>
        <div
          className={cn(
            "mt-3 text-2xl font-semibold tracking-tight tabular",
            tone === "negative" && "text-negative",
          )}
        >
          {value}
        </div>
        {footer && <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}
