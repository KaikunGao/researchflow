/**
 * ResearchFlow 前端共享类型定义。业务数据类型见 types/api.ts。
 */

/** 后端 /api/health 响应 */
export interface HealthResponse {
  status: string;
  service: string;
}

/** 后端 /api/version 响应 */
export interface VersionResponse {
  name: string;
  version: string;
  environment: string;
  python_version: string;
}

export type BackendConnectionState = "checking" | "connected" | "disconnected";
