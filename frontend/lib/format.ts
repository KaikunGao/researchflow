const numberFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 0,
});

/** 以亿元为单位格式化金额，例如 286.5 → "286.5 亿" */
export function formatYi(value: number, withUnit = true): string {
  const text = numberFormatter.format(value);
  return withUnit ? `${text} 亿` : text;
}

/** 百分比，例如 12.34 → "12.3%"；可选显示正负号 */
export function formatPercent(value: number, options?: { signed?: boolean; digits?: number }): string {
  const digits = options?.digits ?? 1;
  const text = value.toFixed(digits);
  if (options?.signed && value > 0) return `+${text}%`;
  return `${text}%`;
}

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatFileSize(sizeKb: number): string {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 相对时间（用于告警列表），例如 "3 天前" */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.round(months / 12)} 年前`;
}
