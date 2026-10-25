import type { Metadata } from "next";
import { AlertCenterView } from "@/components/alerts/alert-center-view";

export const metadata: Metadata = { title: "异常监控" };

export default function AlertsPage() {
  return <AlertCenterView />;
}
