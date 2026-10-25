"use client";

import { Badge } from "@/components/ui/badge";
import { FALLBACK_SETTINGS, useSettings } from "@/hooks/use-settings";

export function WorkspaceBadge() {
  const { data } = useSettings();
  const s = data ?? FALLBACK_SETTINGS;
  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium">{s.workspace_name}</span>
        <Badge variant="outline" className="shrink-0 text-[10px]">v0.3</Badge>
      </div>
      <p className="mt-1 truncate text-[11px] leading-relaxed text-muted-foreground">{s.institution_name}</p>
    </div>
  );
}
