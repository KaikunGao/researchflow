import type { Metadata } from "next";
import { ComparisonView } from "@/components/comparison/comparison-view";

export const metadata: Metadata = { title: "公司对比" };

export default function ComparisonPage() {
  return <ComparisonView />;
}
