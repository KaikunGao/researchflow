"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** 可选：按分组显示 */
  groups?: { label: string; options: SelectOption<T>[] }[];
  label?: string;
  className?: string;
  size?: "sm" | "default";
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}

/** 通用下拉筛选器（受控） */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  groups,
  label,
  className,
  size = "default",
  ariaLabel,
  placeholder,
  disabled,
}: SelectFieldProps<T>) {
  const all = groups ? groups.flatMap((g) => g.options) : options;
  const items = all.map((o) => ({ value: o.value, label: o.label }));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>}
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onChange(next as T);
        }}
      >
        <SelectTrigger size={size} aria-label={ariaLabel ?? label} className="min-w-36">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {groups
            ? groups.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            : options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>
    </div>
  );
}
