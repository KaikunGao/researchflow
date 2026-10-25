"use client";

import { useAsync, type AsyncState } from "@/hooks/use-async";
import { fetchSettings } from "@/lib/api";
import type { WorkspaceSettings } from "@/types/api";

export const FALLBACK_SETTINGS: WorkspaceSettings = {
  workspace_name: "医药生物研究组",
  institution_name: "XX证券研究所",
  data_source_label: "Wind",
  default_basis: "single",
  chart_window: "8",
  amount_unit: "亿元",
  table_density: "comfortable",
};

export function useSettings(): AsyncState<WorkspaceSettings> {
  return useAsync(fetchSettings);
}

export function sourceLine(settings: WorkspaceSettings | null): string {
  const s = settings ?? FALLBACK_SETTINGS;
  return `资料来源：${s.data_source_label}，${s.institution_name}，ResearchFlow 整理`;
}
