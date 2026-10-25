import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/analytics-view";

export const metadata: Metadata = { title: "财务分析" };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
