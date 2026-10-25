import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/overview/overview-dashboard";

export const metadata: Metadata = { title: "研究总览" };

export default function OverviewPage() {
  return <OverviewDashboard />;
}
