"use client";

import { RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackendStatus } from "@/hooks/use-backend-status";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATE_LABEL = {
  checking: { text: "Checking…", dot: "bg-muted-foreground/60 animate-pulse", textClass: "text-muted-foreground" },
  connected: { text: "Connected", dot: "bg-positive", textClass: "text-positive" },
  disconnected: { text: "Disconnected", dot: "bg-negative", textClass: "text-negative" },
} as const;

/**
 * 开发调试用：实际请求 FastAPI /api/health，展示真实连接状态。
 */
export function BackendStatus() {
  const status = useBackendStatus();
  const ui = STATE_LABEL[status.state];

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 text-xs sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2">
        <Server className="size-4 text-muted-foreground" />
        <span className="font-medium">后端服务</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", ui.dot)} />
          <span className={cn("font-medium", ui.textClass)}>{ui.text}</span>
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span className="truncate font-mono">{API_BASE_URL}/api/health</span>
        {status.state === "connected" && status.health && (
          <span>service: <span className="font-mono">{status.health.service}</span></span>
        )}
        {status.state === "connected" && status.version && (
          <span>v{status.version.version} · {status.version.environment}</span>
        )}
        {status.latencyMs !== null && <span>{status.latencyMs} ms</span>}
        {status.state === "disconnected" && status.error && (
          <span className="text-negative">{status.error}（请确认 FastAPI 已在 8000 端口启动）</span>
        )}
        {status.lastCheckedAt && (
          <span>上次检查 {status.lastCheckedAt.toLocaleTimeString("zh-CN", { hour12: false })}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 self-start sm:self-auto"
        onClick={status.refresh}
        disabled={status.state === "checking"}
      >
        <RefreshCw className={cn("size-3.5", status.state === "checking" && "animate-spin")} />
        重新检测
      </Button>
    </div>
  );
}
