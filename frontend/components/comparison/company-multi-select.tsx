"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PanelCompany } from "@/types/api";
import { cn } from "@/lib/utils";

interface CompanyMultiSelectProps {
  companies: PanelCompany[];
  selected: string[];
  onChange: (codes: string[]) => void;
  max: number;
  idPrefix?: string;
}

/** 按子行业分组的公司多选组件 */
export function CompanyMultiSelect({ companies, selected, onChange, max, idPrefix = "cmp" }: CompanyMultiSelectProps) {
  const limitReached = selected.length >= max;
  const groups = new Map<string, PanelCompany[]>();
  for (const c of companies) {
    if (!groups.has(c.sub_industry_label)) groups.set(c.sub_industry_label, []);
    groups.get(c.sub_industry_label)!.push(c);
  }

  function toggle(code: string, checked: boolean) {
    if (checked) {
      if (limitReached) return;
      onChange([...selected, code]);
    } else {
      onChange(selected.filter((s) => s !== code));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from(groups, ([label, list]) => (
        <div key={label}>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {list.map((c) => {
              const checked = selected.includes(c.code);
              const disabled = !checked && limitReached;
              const inputId = `${idPrefix}-${c.code}`;
              return (
                <Label
                  key={c.code}
                  htmlFor={inputId}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm font-normal transition-colors",
                    checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/60",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Checkbox id={inputId} checked={checked} disabled={disabled} onCheckedChange={(value) => toggle(c.code, value === true)} />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground">{c.code}</span>
                </Label>
              );
            })}
          </div>
        </div>
      ))}
      {companies.length === 0 && <p className="text-sm text-muted-foreground">尚未导入任何公司。</p>}
    </div>
  );
}
