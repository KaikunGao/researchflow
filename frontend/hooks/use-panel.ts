"use client";

import { useAsync, type AsyncState } from "@/hooks/use-async";
import { fetchPanel } from "@/lib/api";
import type { AnalyticsPanel } from "@/types/api";

/** 分析面板数据：全部公司 × 报告期 × 指标，一次加载 */
export function usePanel(): AsyncState<AnalyticsPanel> {
  return useAsync(fetchPanel);
}
