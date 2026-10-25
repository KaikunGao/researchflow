"use client";

import { FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  busy?: boolean;
}

const ACCEPT = ".xlsx,.xlsm,.csv";

export function UploadDropzone({ onFileSelected, busy = false }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function openPicker() {
    if (!busy) inputRef.current?.click();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="文件上传区域"
      aria-busy={busy}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
        busy && "cursor-progress opacity-70",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
      <div className="flex size-11 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
        {busy ? <Loader2 className="size-5 animate-spin text-primary" /> : <UploadCloud className="size-5 text-primary" />}
      </div>
      <div>
        <div className="text-sm font-medium">{busy ? "正在解析并导入…" : "将 Wind / Choice 导出的 Excel 或 CSV 拖拽到此处，或点击选择文件"}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          自动识别证券代码、报告期与常用科目，统一换算为亿元；重复导入时以最新文件为准
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
          <FileSpreadsheet className="size-3" /> .xlsx
        </span>
        <span className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
          <FileSpreadsheet className="size-3" /> .csv
        </span>
        <span>单文件 ≤ 20 MB</span>
      </div>
    </div>
  );
}
