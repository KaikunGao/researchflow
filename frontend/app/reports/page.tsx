import type { Metadata } from "next";
import { ReportGeneratorView } from "@/components/reports/report-generator-view";

export const metadata: Metadata = { title: "报告生成" };

export default function ReportsPage() {
  return <ReportGeneratorView />;
}
