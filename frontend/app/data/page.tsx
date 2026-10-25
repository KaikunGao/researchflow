import type { Metadata } from "next";
import { DataManagementView } from "@/components/data/data-management-view";

export const metadata: Metadata = { title: "数据管理" };

export default function DataManagementPage() {
  return <DataManagementView />;
}
