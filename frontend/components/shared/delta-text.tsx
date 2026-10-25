import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaTextProps {
  /** 变化值；null 表示没有可比数据 */
  value: number | null;
  /** 数值后缀，如 "pp"（百分点）或 "亿" */
  suffix?: string;
  /** 变化方向为正时是否代表“好” */
  higherIsBetter?: boolean;
  className?: string;
  digits?: number;
}

export function DeltaText({ value, suffix = "", higherIsBetter = true, className, digits = 1 }: DeltaTextProps) {
  if (value === null || Number.isNaN(value)) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }
  const isZero = Math.abs(value) < 0.05;
  const positive = value > 0;
  const good = isZero ? null : positive === higherIsBetter;
  const Icon = isZero ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular",
        good === null && "text-muted-foreground",
        good === true && "text-positive",
        good === false && "text-negative",
        className,
      )}
    >
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {value.toFixed(digits)}
      {suffix}
    </span>
  );
}
