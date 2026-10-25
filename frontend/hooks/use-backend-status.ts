"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHealth, fetchVersion } from "@/lib/api";
import type { BackendConnectionState, HealthResponse, VersionResponse } from "@/types";

export interface BackendStatus {
  state: BackendConnectionState;
  health: HealthResponse | null;
  version: VersionResponse | null;
  error: string | null;
  lastCheckedAt: Date | null;
  /** 往返延迟（毫秒） */
  latencyMs: number | null;
  refresh: () => void;
}

/**
 * 实际请求 FastAPI 的 /api/health 与 /api/version，用于开发调试。
 * 状态永远由真实请求结果决定，不做硬编码。
 */
export function useBackendStatus(pollIntervalMs = 30_000): BackendStatus {
  const [state, setState] = useState<BackendConnectionState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setState("checking");
      const started = performance.now();
      try {
        const healthResult = await fetchHealth();
        if (cancelled) return;
        setLatencyMs(Math.round(performance.now() - started));
        setHealth(healthResult);
        setState(healthResult.status === "ok" ? "connected" : "disconnected");
        setError(healthResult.status === "ok" ? null : `后端返回状态：${healthResult.status}`);
        try {
          const versionResult = await fetchVersion();
          if (!cancelled) setVersion(versionResult);
        } catch {
          if (!cancelled) setVersion(null);
        }
      } catch (err) {
        if (cancelled) return;
        setHealth(null);
        setVersion(null);
        setLatencyMs(null);
        setState("disconnected");
        setError(err instanceof Error && err.name !== "AbortError" ? err.message : "请求超时或无法连接");
      } finally {
        if (!cancelled) setLastCheckedAt(new Date());
      }
    }

    void check();
    const timer = pollIntervalMs > 0 ? setInterval(check, pollIntervalMs) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [tick, pollIntervalMs]);

  return { state, health, version, error, lastCheckedAt, latencyMs, refresh };
}
