/**
 * 后端 API 响应类型，与 backend/app/models/schemas.py 保持一致。
 */

export type NumberOrNull = number | null;

export interface DatasetOut {
  id: string;
  name: string;
  file_name: string;
  file_type: string;
  size_kb: number;
  layout: string;
  row_count: number;
  fact_count: number;
  company_count: number;
  period_count: number;
  status: "ready" | "processing" | "failed" | "pending";
  warnings: string[];
  created_at: string;
}

export interface ImportResult {
  dataset: DatasetOut;
  companies: string[];
  periods: string[];
  unmapped_indicators: string[];
}

export interface CompanyOut {
  code: string;
  name: string;
  exchange: string;
  period_count: number;
  first_period: string | null;
  latest_period: string | null;
}

export interface PeriodMetrics {
  period_end: string;
  year: number;
  quarter: number;
  label: string;
  quarter_label: string;
  cumulative: Record<string, NumberOrNull>;
  single: Record<string, NumberOrNull>;
  ratios_cumulative: Record<string, NumberOrNull>;
  ratios_single: Record<string, NumberOrNull>;
  yoy_cumulative: Record<string, NumberOrNull>;
  yoy_single: Record<string, NumberOrNull>;
  qoq_single: Record<string, NumberOrNull>;
  ratio_change_cumulative: Record<string, NumberOrNull>;
  ratio_change_single: Record<string, NumberOrNull>;
  balance_ratios: Record<string, NumberOrNull>;
}

export interface CompanySnapshot {
  company: CompanyOut;
  period: PeriodMetrics;
  commentary: string;
  series: PeriodMetrics[];
  field_labels: Record<string, string>;
  methodology: string;
}

export interface WorkspaceStats {
  dataset_count: number;
  company_count: number;
  fact_count: number;
}

/* ------------------------------------------------------------- analytics panel */

export interface PanelCompany {
  code: string;
  name: string;
  exchange: string;
  sub_industry: string;
  sub_industry_label: string;
  period_count: number;
  latest_period: string | null;
}

export interface PanelMetric {
  key: string;
  label: string;
  short_label: string;
  unit: string; // "亿元" | "%" | "pct" | "天" | "倍"
  group: string;
  higher_is_better: boolean;
}

export interface PanelPeriodPoint {
  period_end: string;
  label: string;
  quarter_label: string;
  values: Record<string, NumberOrNull>;
}

export interface AnalyticsPanel {
  companies: PanelCompany[];
  periods: string[];
  period_labels: Record<string, string>;
  metrics: PanelMetric[];
  sub_industries: { key: string; label: string }[];
  data: Record<string, Record<string, PanelPeriodPoint>>;
  methodology: string;
}

/* --------------------------------------------------------------------- alerts */

export type AlertSeverity = "high" | "medium" | "low";
export type AlertStatus = "active" | "acknowledged" | "resolved";
export type AlertOperator = "lt" | "gt";

export interface AlertRule {
  id: string;
  name: string;
  metric_key: string;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleInput {
  name: string;
  metric_key: string;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled?: boolean;
  description?: string;
}

export interface AlertOut {
  id: string;
  rule_id: string;
  rule_name: string | null;
  code: string;
  company_name: string | null;
  period_end: string;
  metric_key: string;
  value: NumberOrNull;
  threshold: number;
  operator: AlertOperator;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  triggered_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface AlertSummary {
  active_high: number;
  active_medium: number;
  active_low: number;
  active_total: number;
  acknowledged: number;
  resolved: number;
  rules_enabled: number;
  rules_total: number;
  last_evaluated_at: string | null;
}

export interface EvaluateResult {
  created: number;
  kept: number;
  resolved: number;
  evaluated_at: string;
}

/* ----------------------------------------------------------- settings & reports */

export interface WorkspaceSettings {
  workspace_name: string;
  institution_name: string;
  data_source_label: string;
  default_basis: "single" | "cumulative";
  chart_window: string;
  amount_unit: string;
  table_density: string;
}

export type ReportType = "industry_overview" | "company_deep_dive" | "peer_comparison" | "periodic_update";

export interface ReportCreate {
  report_type: ReportType;
  codes: string[];
  period_end?: string | null;
  metrics: string[];
}

export interface ReportOut {
  id: string;
  title: string;
  report_type: ReportType;
  report_type_label: string;
  codes: string[];
  period_end: string | null;
  metrics: string[];
  status: "completed" | "failed";
  file_name: string | null;
  error: string | null;
  created_at: string;
}
