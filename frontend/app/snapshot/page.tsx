import type { Metadata } from "next";
import { Suspense } from "react";
import { SnapshotView } from "@/components/snapshot/snapshot-view";

export const metadata: Metadata = { title: "财报速览" };

export default function SnapshotPage() {
  return (
    <Suspense fallback={null}>
      <SnapshotView />
    </Suspense>
  );
}
