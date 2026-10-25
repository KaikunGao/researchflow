import type {
  AlertOut,
  AlertRule,
  AlertRuleInput,
  AlertStatus,
  AlertSummary,
  AnalyticsPanel,
  CompanyOut,
  CompanySnapshot,
  DatasetOut,
  EvaluateResult,
  ImportResult,
  ReportCreate,
  ReportOut,
  WorkspaceSettings,
  WorkspaceStats,
} from "@/types/api";
import type { HealthResponse, VersionResponse } from "@/types";

/** FastAPI 后端地址，默认指向本地开发服务器 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 10_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...init?.headers },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new ApiError(await readErrorDetail(response), response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("请求超时，请确认后端服务已启动。");
    }
    throw new ApiError("无法连接后端服务，请确认 FastAPI 已在 8000 端口启动。");
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : String(d))).join("；");
    }
  } catch {
    /* ignore */
  }
  return `请求失败：HTTP ${response.status}`;
}

/* ------------------------------------------------------------------ system */

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health", { timeoutMs: 5000 });
}

export function fetchVersion(): Promise<VersionResponse> {
  return request<VersionResponse>("/api/version", { timeoutMs: 5000 });
}

/* ---------------------------------------------------------------- datasets */

export function uploadDataset(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append("file", file);
  return request<ImportResult>("/api/datasets/import", { method: "POST", body: form, timeoutMs: 60_000 });
}

export function fetchPublicData(codes: string[], startYear: number): Promise<ImportResult> {
  return request<ImportResult>("/api/datasets/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes, start_year: startYear }),
    timeoutMs: 180_000,
  });
}

export function importSampleDataset(): Promise<ImportResult> {
  return request<ImportResult>("/api/datasets/import-sample", { method: "POST", timeoutMs: 60_000 });
}

export function listDatasets(): Promise<DatasetOut[]> {
  return request<DatasetOut[]>("/api/datasets");
}

export function deleteDataset(id: string): Promise<void> {
  return request<void>(`/api/datasets/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function fetchWorkspaceStats(): Promise<WorkspaceStats> {
  return request<WorkspaceStats>("/api/datasets/stats");
}

export const SAMPLE_FILE_URL = `${API_BASE_URL}/api/datasets/sample-file`;

/* --------------------------------------------------------------- companies */

export function listCompanies(): Promise<CompanyOut[]> {
  return request<CompanyOut[]>("/api/companies");
}

export function fetchSnapshot(code: string, period?: string): Promise<CompanySnapshot> {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return request<CompanySnapshot>(`/api/companies/${encodeURIComponent(code)}/snapshot${query}`);
}

/* ------------------------------------------------------------------ export */

export function worksheetExportUrl(codes?: string[]): string {
  const query = codes && codes.length > 0 ? `?codes=${encodeURIComponent(codes.join(","))}` : "";
  return `${API_BASE_URL}/api/export/worksheet${query}`;
}

/* --------------------------------------------------------------- analytics */

export function fetchPanel(): Promise<AnalyticsPanel> {
  return request<AnalyticsPanel>("/api/analytics/panel", { timeoutMs: 20_000 });
}

/* ------------------------------------------------------------------ alerts */

export function listAlerts(status?: AlertStatus): Promise<AlertOut[]> {
  return request<AlertOut[]>(`/api/alerts${status ? `?status=${status}` : ""}`);
}

export function fetchAlertSummary(): Promise<AlertSummary> {
  return request<AlertSummary>("/api/alerts/summary");
}

export function evaluateAlerts(): Promise<EvaluateResult> {
  return request<EvaluateResult>("/api/alerts/evaluate", { method: "POST", timeoutMs: 30_000 });
}

export function updateAlertStatus(id: string, status: AlertStatus): Promise<AlertOut> {
  return request<AlertOut>(`/api/alerts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function listAlertRules(): Promise<AlertRule[]> {
  return request<AlertRule[]>("/api/alerts/rules");
}

export function createAlertRule(input: AlertRuleInput): Promise<AlertRule> {
  return request<AlertRule>("/api/alerts/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateAlertRule(id: string, patch: Partial<AlertRuleInput>): Promise<AlertRule> {
  return request<AlertRule>(`/api/alerts/rules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteAlertRule(id: string): Promise<void> {
  return request<void>(`/api/alerts/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------- settings */

export function fetchSettings(): Promise<WorkspaceSettings> {
  return request<WorkspaceSettings>("/api/settings");
}

export function saveSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  return request<WorkspaceSettings>("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

/* ----------------------------------------------------------------- reports */

export function listReports(): Promise<ReportOut[]> {
  return request<ReportOut[]>("/api/reports");
}

export function createReport(input: ReportCreate): Promise<ReportOut> {
  return request<ReportOut>("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    timeoutMs: 120_000,
  });
}

export function deleteReport(id: string): Promise<void> {
  return request<void>(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function reportDownloadUrl(id: string): string {
  return `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/download`;
}
