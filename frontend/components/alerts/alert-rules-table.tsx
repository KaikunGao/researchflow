"use client";

import { Plus, Trash } from "lucide-react";
import { useState } from "react";
import { SelectField } from "@/components/shared/filters";
import { SeverityBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlertOperator, AlertRule, AlertRuleInput, AlertSeverity, PanelMetric } from "@/types/api";

interface AlertRulesTableProps {
  rules: AlertRule[];
  metrics: PanelMetric[];
  onToggle: (rule: AlertRule, enabled: boolean) => void;
  onThreshold: (rule: AlertRule, threshold: number) => void;
  onDelete: (rule: AlertRule) => void;
  onCreate: (input: AlertRuleInput) => Promise<void>;
  busyId?: string | null;
}

const SEVERITY_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

const OPERATOR_OPTIONS = [
  { value: "lt", label: "低于 <" },
  { value: "gt", label: "高于 >" },
] as const;

function unitOf(metrics: PanelMetric[], key: string): string {
  const m = metrics.find((x) => x.key === key);
  if (!m) return "";
  return m.unit === "pct" ? " pct" : m.unit === "%" ? "%" : ` ${m.unit}`;
}

export function AlertRulesTable({ rules, metrics, onToggle, onThreshold, onDelete, onCreate, busyId }: AlertRulesTableProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AlertRuleInput>({ name: "", metric_key: "revenue_yoy", operator: "lt", threshold: 0, severity: "medium", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const metricOptions = metrics.map((m) => ({ value: m.key, label: `${m.label}（${m.unit}）` }));

  function commitThreshold(rule: AlertRule) {
    const raw = drafts[rule.id];
    if (raw === undefined) return;
    const next = Number(raw);
    setDrafts((d) => {
      const copy = { ...d };
      delete copy[rule.id];
      return copy;
    });
    if (Number.isFinite(next) && next !== rule.threshold) onThreshold(rule, next);
  }

  async function submit() {
    if (!form.name.trim()) {
      setFormError("请填写规则名称。");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate({ ...form, name: form.name.trim() });
      setShowForm(false);
      setForm({ name: "", metric_key: "revenue_yoy", operator: "lt", threshold: 0, severity: "medium", description: "" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 overflow-x-auto px-4">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[190px]">规则</TableHead>
              <TableHead>触发条件（作用于每家公司最新报告期）</TableHead>
              <TableHead>严重度</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="text-right">启用</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => {
              const metric = metrics.find((m) => m.key === rule.metric_key);
              return (
                <TableRow key={rule.id} className="text-sm">
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{metric?.short_label ?? rule.metric_key} {rule.operator === "lt" ? "<" : ">"}</code>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-7 w-24 text-xs"
                        aria-label={`${rule.name} 阈值`}
                        value={drafts[rule.id] ?? String(rule.threshold)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [rule.id]: e.target.value }))}
                        onBlur={() => commitThreshold(rule)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        disabled={busyId === rule.id}
                      />
                      <span className="text-muted-foreground">{unitOf(metrics, rule.metric_key)}</span>
                    </div>
                  </TableCell>
                  <TableCell><SeverityBadge severity={rule.severity} /></TableCell>
                  <TableCell className="max-w-sm text-xs text-muted-foreground">{rule.description}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={rule.enabled} disabled={busyId === rule.id} onCheckedChange={(v) => onToggle(rule, v)} aria-label={`${rule.name} 启用开关`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label={`删除规则 ${rule.name}`} disabled={busyId === rule.id} onClick={() => onDelete(rule)}>
                      <Trash className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {showForm ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Input placeholder="规则名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="规则名称" />
            <SelectField value={form.metric_key} onChange={(v) => setForm({ ...form, metric_key: v })} options={metricOptions} ariaLabel="指标" className="[&>button]:w-full" />
            <SelectField<AlertOperator> value={form.operator} onChange={(v) => setForm({ ...form, operator: v })} options={[...OPERATOR_OPTIONS]} ariaLabel="比较方式" className="[&>button]:w-full" />
            <Input type="number" step="0.1" placeholder="阈值" value={String(form.threshold)} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} aria-label="阈值" />
            <SelectField<AlertSeverity> value={form.severity} onChange={(v) => setForm({ ...form, severity: v })} options={[...SEVERITY_OPTIONS]} ariaLabel="严重度" className="[&>button]:w-full" />
          </div>
          <Input className="mt-3" placeholder="说明（可选）" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="规则说明" />
          {formError && <p className="mt-2 text-xs text-negative">{formError}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void submit()} disabled={submitting}>保存规则并重新评估</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} disabled={submitting}>取消</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setShowForm(true)}>
          <Plus className="size-3.5" /> 新建规则
        </Button>
      )}
    </div>
  );
}
