"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";

interface CommentaryCardProps {
  text: string;
  methodology: string;
  periodLabel: string;
}

export function CommentaryCard({ text, methodology, periodLabel }: CommentaryCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("复制失败，请手动选择文本复制。");
    }
  }

  return (
    <SectionCard
      title="点评数据段落"
      description={`${periodLabel} · 自动生成，可直接粘贴进财报点评后再润色`}
      actions={
        <Button variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="size-3.5 text-positive" /> : <Copy className="size-3.5" />}
          {copied ? "已复制" : "复制全文"}
        </Button>
      }
    >
      <div className="space-y-2 rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
        {text.split("\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
      {copyError && <p className="mt-2 text-xs text-negative">{copyError}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{methodology}</p>
    </SectionCard>
  );
}
