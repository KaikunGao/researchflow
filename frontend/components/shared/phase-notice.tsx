import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhaseNoticeProps {
  message: string;
  className?: string;
  tone?: "info" | "warning";
}

/** 用于明确告知用户某功能尚未在本阶段开放，而不是假装操作成功 */
export function PhaseNotice({ message, className, tone = "info" }: PhaseNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tone === "info" && "border-primary/20 bg-primary/5 text-primary",
        tone === "warning" && "border-warning/40 bg-warning/10 text-amber-900",
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
