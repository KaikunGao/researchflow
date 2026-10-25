"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SelectField } from "@/components/shared/filters";
import { PhaseNotice } from "@/components/shared/phase-notice";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/hooks/use-async";
import { FALLBACK_SETTINGS, useSettings } from "@/hooks/use-settings";
import { API_BASE_URL, saveSettings } from "@/lib/api";
import type { WorkspaceSettings } from "@/types/api";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div className="shrink-0 sm:w-64">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const settings = useSettings();
  const [formState, setFormState] = useState<WorkspaceSettings | null>(null);
  const form: WorkspaceSettings = formState ?? settings.data ?? FALLBACK_SETTINGS;
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = settings.data ? JSON.stringify(settings.data) !== JSON.stringify(form) : false;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSettings(form);
      settings.setData(saved);
      setFormState(null);
      setNotice("设置已保存，图表资料来源与报告页眉会立即使用新的名称。");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setFormState({ ...form, [key]: value });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="设置"
        description="工作区、数据来源与显示偏好，保存在后端 SQLite 中。"
        actions={
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存更改
          </Button>
        }
      />

      {settings.error && <PhaseNotice tone="warning" message={`无法读取设置：${settings.error}`} />}
      {error && <PhaseNotice tone="warning" message={`保存失败：${error}`} />}
      {notice && <PhaseNotice message={notice} />}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="通用设置" description="General Settings" contentClassName="divide-y">
          <SettingRow label="工作区名称" description="显示在侧边栏与报告页眉">
            <Input value={form.workspace_name} onChange={(e) => set("workspace_name", e.target.value)} />
          </SettingRow>
          <SettingRow label="研究所署名" description="用于图表与报告的「资料来源：Wind，XX证券研究所」">
            <Input value={form.institution_name} onChange={(e) => set("institution_name", e.target.value)} />
          </SettingRow>
          <SettingRow label="后端服务地址" description="由环境变量 NEXT_PUBLIC_API_BASE_URL 控制">
            <Input value={API_BASE_URL} readOnly className="font-mono text-xs" />
          </SettingRow>
        </SectionCard>

        <SectionCard title="数据偏好" description="Data Preferences" contentClassName="divide-y">
          <SettingRow label="数据来源名称" description="写入资料来源署名，例如 Wind / Choice / iFinD">
            <Input value={form.data_source_label} onChange={(e) => set("data_source_label", e.target.value)} />
          </SettingRow>
          <SettingRow label="金额单位" description="当前标准化流程固定使用亿元">
            <Input value="亿元" readOnly />
          </SettingRow>
        </SectionCard>

        <SectionCard title="显示偏好" description="Display Preferences · 作用于财报速览与报告中的标准图表" contentClassName="divide-y" className="xl:col-span-2">
          <SettingRow label="默认口径" description="标准图表默认展示单季度还是累计口径">
            <SelectField<WorkspaceSettings["default_basis"]>
              value={form.default_basis}
              onChange={(v) => set("default_basis", v)}
              options={[{ value: "single", label: "单季度" }, { value: "cumulative", label: "累计" }]}
              className="[&>button]:w-full"
            />
          </SettingRow>
          <SettingRow label="图表显示报告期数" description="标准图表默认展示最近多少个报告期">
            <SelectField
              value={form.chart_window}
              onChange={(v) => set("chart_window", v)}
              options={["4", "6", "8", "12", "16"].map((v) => ({ value: v, label: `最近 ${v} 期` }))}
              className="[&>button]:w-full"
            />
          </SettingRow>
        </SectionCard>
      </div>
    </div>
  );
}
