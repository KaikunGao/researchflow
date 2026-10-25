"use client";

import Link from "next/link";
import { Database, FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { importSampleDataset } from "@/lib/api";
import { errorMessage } from "@/hooks/use-async";

interface EmptyDataStateProps {
  onImported: () => void;
  description?: string;
}

/** 尚未导入数据时的统一空状态，带「导入示例文件」入口 */
export function EmptyDataState({ onImported, description }: EmptyDataStateProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setImporting(true);
    setError(null);
    try {
      await importSampleDataset();
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="py-10">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Database className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">尚未导入任何公司数据</div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {description ?? "先在「数据管理」导入 Wind / Choice 导出的财务数据，或直接导入内置的示例文件体验完整流程。"}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => void run()} disabled={importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            导入示例文件
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/data" />}>
            前往数据管理
          </Button>
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
      </CardContent>
    </Card>
  );
}
