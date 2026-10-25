"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** 触发重新加载 */
  reload: () => void;
  /** 本地更新数据（例如乐观更新） */
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiError || err instanceof Error ? err.message : "请求失败";
}

/**
 * 简单的异步数据 hook：首次渲染与 reload() 时执行 loader。
 * 状态更新都发生在 Promise 回调里，符合 React 编译器对 effect 的要求。
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return {
    data,
    error,
    loading,
    reload: () => {
      setLoading(true);
      setTick((t) => t + 1);
    },
    setData: (updater) => setData((prev) => (typeof updater === "function" ? (updater as (p: T | null) => T | null)(prev) : updater)),
  };
}
