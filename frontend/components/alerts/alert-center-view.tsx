"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { AlertRulesTable } from "@/components/alerts/alert-rules-table";
import { AlertsTable } from "@/components/alerts/alerts-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyDataState } from "@/components/shared/empty-data-state";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage, useAsync } from "@/hooks/use-async";
import { usePanel } from "@/hooks/use-panel";
import {
  createAlertRule,
  deleteAlertRule,
  evaluateAlerts,
  fetchAlertSummary,
  listAlertRules,
  listAlerts,
  updateAlertRule,
  updateAlertStatus,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AlertOut, AlertRule, AlertRuleInput, AlertStatus } from "@/types/api";
import { cn } from "@/lib/utils";

export function AlertCenterView() {
  const panel = usePanel();
  const summary = useAsync(fetchAlertSummary);
  const alerts = useAsync(listAlerts);
  const rules = useAsync(listAlertRules);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const metricLabels = useMemo(() => Object.fromEntries((panel.data?.metrics ?? []).map((m) => [m.key, m.label])), [panel.data]);
  const periodLabels = panel.data?.period_labels ?? {};

  const active = useMemo(() => (alerts.data ?? []).filter((a) => a.status === "active"), [alerts.data]);
  const history = useMemo(() => (alerts.data ?? []).filter((a) => a.status !== "active").sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [alerts.data]);

  function reloadAll() {
    summary.reload();
    alerts.reload();
    rules.reload();
  }

  async function run<T>(id: string | null, task: () => Promise<T>, after?: (result: T) => void) {
    setBusyId(id);
    setError(null);
    try {
      const result = await task();
      after?.(result);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEvaluate() {
    setEvaluating(true);
    setError(null);
    try {
      const result = await evaluateAlerts();
      setNotice(`已按当前规则重新评估：新增 ${result.created} 条，保持 ${result.kept} 条，解除 ${result.resolved} 条。`);
      reloadAll();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setEvaluating(false);
    }
  }

  function handleStatus(alert: AlertOut, status: AlertStatus) {
    void run(alert.id, () => updateAlertStatus(alert.id, status), () => {
      alerts.reload();
      summary.reload();
    });
  }

  function handleRulePatch(rule: AlertRule, patch: Partial<AlertRuleInput>) {
    void run(rule.id, async () => {
      await updateAlertRule(rule.id, patch);
      await evaluateAlerts();
    }, reloadAll);
  }

  function handleRuleDelete(rule: AlertRule) {
    if (!window.confirm(`删除规则「${rule.name}」？由该规则产生的告警记录会一并删除。`)) return;
    void run(rule.id, async () => {
      await deleteAlertRule(rule.id);
      await evaluateAlerts();
    }, reloadAll);
  }

  async function handleRuleCreate(input: AlertRuleInput) {
    await createAlertRule(input);
    await evaluateAlerts();
    reloadAll();
  }

  const s = summary.data;
  const cards = [
    { label: "高严重度", labelEn: "High", value: s?.active_high ?? 0, icon: AlertOctagon, className: "text-negative" },
    { label: "中严重度", labelEn: "Medium", value: s?.active_medium ?? 0, icon: AlertTriangle, className: "text-amber-700" },
    { label: "低严重度", labelEn: "Low", value: s?.active_low ?? 0, icon: Info, className: "text-muted-foreground" },
    { label: "已确认 / 已解除", labelEn: "Acknowledged / Resolved", value: (s?.acknowledged ?? 0) + (s?.resolved ?? 0), icon: CheckCircle2, className: "text-positive" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Alert Center"
        title="异常监控"
        description="规则引擎在每次导入后自动评估各公司最新报告期的关键指标，也可以手动重新评估。"
        actions={
          <Button variant="outline" onClick={() => void handleEvaluate()} disabled={evaluating}>
            <RefreshCw className={evaluating ? "size-4 animate-spin" : "size-4"} />
            重新评估
          </Button>
        }
      />

      {error && <PhaseNotice tone="warning" message={error} />}
      {notice && <PhaseNotice message={notice} />}
      {panel.data && panel.data.companies.length === 0 && <EmptyDataState onImported={() => { panel.reload(); reloadAll(); }} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.labelEn} className="gap-0 py-4">
            <CardContent className="px-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{card.labelEn}</div>
                </div>
                <card.icon className={cn("size-4", card.className)} />
              </div>
              <div className={cn("mt-3 text-2xl font-semibold tabular", card.className)}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {s?.last_evaluated_at ? `上次评估：${formatDateTime(s.last_evaluated_at)}` : "尚未评估"} · 启用规则 {s?.rules_enabled ?? 0} / {s?.rules_total ?? 0}
      </p>

      <Tabs defaultValue="active" className="gap-4">
        <TabsList>
          <TabsTrigger value="active">活跃告警 ({active.length})</TabsTrigger>
          <TabsTrigger value="rules">告警规则 ({rules.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="history">历史记录 ({history.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <SectionCard title="活跃告警" description="Active Alerts · 按严重度与触发时间排序">
            <AlertsTable alerts={active} metricLabels={metricLabels} periodLabels={periodLabels} onStatusChange={handleStatus} busyId={busyId} emptyText="当前没有活跃告警" />
          </SectionCard>
        </TabsContent>
        <TabsContent value="rules">
          <SectionCard title="告警规则" description="Alert Rules · 修改阈值或开关后会自动重新评估">
            {rules.data && panel.data ? (
              <AlertRulesTable
                rules={rules.data}
                metrics={panel.data.metrics}
                onToggle={(rule, enabled) => handleRulePatch(rule, { enabled })}
                onThreshold={(rule, threshold) => handleRulePatch(rule, { threshold })}
                onDelete={handleRuleDelete}
                onCreate={handleRuleCreate}
                busyId={busyId}
              />
            ) : (
              <p className="text-sm text-muted-foreground">正在加载规则…</p>
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="history">
          <SectionCard title="告警历史" description="Alert History · 已确认或已解除的告警记录">
            <AlertsTable alerts={history} metricLabels={metricLabels} periodLabels={periodLabels} onStatusChange={handleStatus} busyId={busyId} showResolved emptyText="暂无历史记录" />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
