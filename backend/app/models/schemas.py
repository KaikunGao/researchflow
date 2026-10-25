"""API 响应模型（Pydantic）。"""

from pydantic import BaseModel, Field

Number = float | None


class HealthResponse(BaseModel):
    status: str = Field(examples=["ok"])
    service: str = Field(examples=["researchflow-api"])


class VersionResponse(BaseModel):
    name: str
    version: str
    environment: str
    python_version: str


class DatasetOut(BaseModel):
    id: str
    name: str
    file_name: str
    file_type: str
    size_kb: float
    layout: str
    row_count: int
    fact_count: int
    company_count: int
    period_count: int
    status: str
    warnings: list[str]
    created_at: str


class ImportResult(BaseModel):
    dataset: DatasetOut
    companies: list[str]
    periods: list[str]
    unmapped_indicators: list[str]


class CompanyOut(BaseModel):
    code: str
    name: str
    exchange: str
    period_count: int
    first_period: str | None
    latest_period: str | None


class PeriodMetricsOut(BaseModel):
    period_end: str
    year: int
    quarter: int
    label: str
    quarter_label: str
    cumulative: dict[str, Number]
    single: dict[str, Number]
    ratios_cumulative: dict[str, Number]
    ratios_single: dict[str, Number]
    yoy_cumulative: dict[str, Number]
    yoy_single: dict[str, Number]
    qoq_single: dict[str, Number]
    ratio_change_cumulative: dict[str, Number]
    ratio_change_single: dict[str, Number]
    balance_ratios: dict[str, Number]


class CompanyFinancials(BaseModel):
    company: CompanyOut
    series: list[PeriodMetricsOut]
    field_labels: dict[str, str]
    methodology: str


class CompanySnapshot(BaseModel):
    company: CompanyOut
    period: PeriodMetricsOut
    commentary: str
    series: list[PeriodMetricsOut]
    field_labels: dict[str, str]
    methodology: str


class WorkspaceStats(BaseModel):
    dataset_count: int
    company_count: int
    fact_count: int


# ----------------------------------------------------------------------------- analytics panel


class PanelCompany(BaseModel):
    code: str
    name: str
    exchange: str
    sub_industry: str
    sub_industry_label: str
    period_count: int
    latest_period: str | None


class PanelMetric(BaseModel):
    key: str
    label: str
    short_label: str
    unit: str
    group: str
    higher_is_better: bool


class PanelPeriodPoint(BaseModel):
    period_end: str
    label: str
    quarter_label: str
    values: dict[str, Number]


class AnalyticsPanel(BaseModel):
    companies: list[PanelCompany]
    periods: list[str]
    period_labels: dict[str, str]
    metrics: list[PanelMetric]
    sub_industries: list[dict[str, str]]
    data: dict[str, dict[str, PanelPeriodPoint]]
    methodology: str


# ----------------------------------------------------------------------------- alerts


class AlertRuleOut(BaseModel):
    id: str
    name: str
    metric_key: str
    operator: str
    threshold: float
    severity: str
    enabled: bool
    description: str
    created_at: str
    updated_at: str


class AlertRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    metric_key: str
    operator: str = Field(pattern="^(lt|gt)$")
    threshold: float
    severity: str = Field(pattern="^(high|medium|low)$")
    enabled: bool = True
    description: str = ""


class AlertRuleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    metric_key: str | None = None
    operator: str | None = Field(default=None, pattern="^(lt|gt)$")
    threshold: float | None = None
    severity: str | None = Field(default=None, pattern="^(high|medium|low)$")
    enabled: bool | None = None
    description: str | None = None


class AlertOut(BaseModel):
    id: str
    rule_id: str
    rule_name: str | None
    code: str
    company_name: str | None
    period_end: str
    metric_key: str
    value: Number
    threshold: float
    operator: str
    severity: str
    status: str
    title: str
    description: str
    triggered_at: str
    updated_at: str
    resolved_at: str | None


class AlertStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|acknowledged|resolved)$")


class AlertSummary(BaseModel):
    active_high: int
    active_medium: int
    active_low: int
    active_total: int
    acknowledged: int
    resolved: int
    rules_enabled: int
    rules_total: int
    last_evaluated_at: str | None


class EvaluateResult(BaseModel):
    created: int
    kept: int
    resolved: int
    evaluated_at: str


# ----------------------------------------------------------------------------- settings & reports


class SettingsOut(BaseModel):
    workspace_name: str
    institution_name: str
    data_source_label: str
    default_basis: str
    chart_window: str
    amount_unit: str
    table_density: str


class SettingsUpdate(BaseModel):
    workspace_name: str | None = None
    institution_name: str | None = None
    data_source_label: str | None = None
    default_basis: str | None = Field(default=None, pattern="^(single|cumulative)$")
    chart_window: str | None = Field(default=None, pattern="^(4|6|8|12|16)$")
    amount_unit: str | None = None
    table_density: str | None = Field(default=None, pattern="^(comfortable|compact)$")


class ReportCreate(BaseModel):
    report_type: str = Field(pattern="^(industry_overview|company_deep_dive|peer_comparison|periodic_update)$")
    codes: list[str] = Field(default_factory=list)
    period_end: str | None = None
    metrics: list[str] = Field(default_factory=list)


class ReportOut(BaseModel):
    id: str
    title: str
    report_type: str
    report_type_label: str
    codes: list[str]
    period_end: str | None
    metrics: list[str]
    status: str
    file_name: str | None
    error: str | None
    created_at: str


class PublicFetchRequest(BaseModel):
    codes: list[str] = Field(min_length=1, max_length=20, description="证券代码列表，如 600276.SH")
    start_year: int = Field(default=2019, ge=2000, le=2100)
