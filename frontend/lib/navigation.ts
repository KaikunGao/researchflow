import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Database,
  FileChartColumn,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  LineChart,
  Settings,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      { href: "/", label: "总览", labelEn: "Overview", icon: LayoutDashboard, description: "行业财务表现总览" },
      { href: "/data", label: "数据管理", labelEn: "Data Management", icon: Database, description: "导入与管理财务数据集" },
      { href: "/snapshot", label: "财报速览", labelEn: "Earnings Snapshot", icon: FileChartColumn, description: "单季度拆分、点评段落与标准图" },
      { href: "/analytics", label: "财务分析", labelEn: "Financial Analytics", icon: LineChart, description: "指标趋势与公司排名" },
      { href: "/comparison", label: "公司对比", labelEn: "Company Comparison", icon: GitCompareArrows, description: "多家公司横向对比" },
    ],
  },
  {
    title: "Research Tools",
    items: [
      { href: "/alerts", label: "异常监控", labelEn: "Alert Center", icon: Bell, description: "关键财务指标异常告警" },
      { href: "/reports", label: "报告生成", labelEn: "Report Generator", icon: FileText, description: "自动化研究报告" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "设置", labelEn: "Settings", icon: Settings, description: "工作区与显示偏好" },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return ALL_NAV_ITEMS[0];
  return ALL_NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href));
}
