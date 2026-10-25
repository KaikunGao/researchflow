import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Activity className="size-4" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold tracking-tight text-foreground">ResearchFlow</div>
          <div className="truncate text-[11px] text-muted-foreground">Financial Research Intelligence</div>
        </div>
      )}
    </div>
  );
}
