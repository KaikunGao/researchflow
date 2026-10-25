"""分析指标目录：把 PeriodMetrics 展平成前端可直接选择的指标。"""

from dataclasses import dataclass

from app.services.metrics import PeriodMetrics

Number = float | None


@dataclass(frozen=True)
class MetricDef:
    key: str
    label: str
    short_label: str
    unit: str  # "亿元" | "%" | "pct" | "天"
    group: str
    higher_is_better: bool = True


METRIC_CATALOG: list[MetricDef] = [
    MetricDef("revenue", "营业收入（累计）", "营收", "亿元", "规模"),
    MetricDef("net_profit", "归母净利润（累计）", "净利润", "亿元", "规模"),
    MetricDef("net_profit_deducted", "扣非归母净利润（累计）", "扣非净利润", "亿元", "规模"),
    MetricDef("operating_cash_flow", "经营活动现金流净额（累计）", "经营现金流", "亿元", "规模"),
    MetricDef("revenue_single", "营业收入（单季度）", "单季营收", "亿元", "单季度"),
    MetricDef("net_profit_single", "归母净利润（单季度）", "单季净利润", "亿元", "单季度"),
    MetricDef("revenue_yoy", "营收同比增速（累计）", "营收增速", "%", "成长"),
    MetricDef("net_profit_yoy", "归母净利润同比增速（累计）", "净利增速", "%", "成长"),
    MetricDef("net_profit_deducted_yoy", "扣非净利润同比增速（累计）", "扣非增速", "%", "成长"),
    MetricDef("revenue_single_yoy", "单季度营收同比", "单季营收同比", "%", "成长"),
    MetricDef("net_profit_single_yoy", "单季度净利润同比", "单季净利同比", "%", "成长"),
    MetricDef("revenue_qoq", "单季度营收环比", "营收环比", "%", "成长"),
    MetricDef("net_profit_qoq", "单季度净利润环比", "净利环比", "%", "成长"),
    MetricDef("gross_margin", "毛利率（累计）", "毛利率", "%", "盈利"),
    MetricDef("net_margin", "净利率（累计）", "净利率", "%", "盈利"),
    MetricDef("deducted_net_margin", "扣非净利率（累计）", "扣非净利率", "%", "盈利"),
    MetricDef("gross_margin_single", "毛利率（单季度）", "单季毛利率", "%", "盈利"),
    MetricDef("net_margin_single", "净利率（单季度）", "单季净利率", "%", "盈利"),
    MetricDef("roe_diluted", "ROE（摊薄）", "ROE", "%", "盈利"),
    MetricDef("selling_ratio", "销售费用率", "销售费用率", "%", "费用", False),
    MetricDef("admin_ratio", "管理费用率", "管理费用率", "%", "费用", False),
    MetricDef("rd_ratio", "研发费用率", "研发费用率", "%", "费用"),
    MetricDef("finance_ratio", "财务费用率", "财务费用率", "%", "费用", False),
    MetricDef("expense_ratio", "期间费用率", "期间费用率", "%", "费用", False),
    MetricDef("gross_margin_change", "毛利率同比变化", "毛利率变化", "pct", "变化"),
    MetricDef("net_margin_change", "净利率同比变化", "净利率变化", "pct", "变化"),
    MetricDef("selling_ratio_change", "销售费用率同比变化", "销售费率变化", "pct", "变化", False),
    MetricDef("debt_ratio", "资产负债率", "负债率", "%", "资产质量", False),
    MetricDef("inventory_days", "存货周转天数", "存货天数", "天", "资产质量", False),
    MetricDef("receivable_days", "应收账款周转天数", "应收天数", "天", "资产质量", False),
    MetricDef("cash_conversion", "净现比（经营现金流 / 净利润）", "净现比", "倍", "资产质量"),
    MetricDef("total_assets", "总资产", "总资产", "亿元", "规模"),
    MetricDef("equity_parent", "归母净资产", "净资产", "亿元", "规模"),
]

METRIC_MAP: dict[str, MetricDef] = {m.key: m for m in METRIC_CATALOG}


def flatten(m: PeriodMetrics) -> dict[str, Number]:
    cum, single = m.cumulative, m.single
    ocf, np_ = cum.get("operating_cash_flow"), cum.get("net_profit")
    cash_conversion = round(ocf / np_, 2) if ocf is not None and np_ not in (None, 0) else None
    return {
        "revenue": cum.get("revenue"),
        "net_profit": np_,
        "net_profit_deducted": cum.get("net_profit_deducted"),
        "operating_cash_flow": ocf,
        "revenue_single": single.get("revenue"),
        "net_profit_single": single.get("net_profit"),
        "revenue_yoy": m.yoy_cumulative.get("revenue"),
        "net_profit_yoy": m.yoy_cumulative.get("net_profit"),
        "net_profit_deducted_yoy": m.yoy_cumulative.get("net_profit_deducted"),
        "revenue_single_yoy": m.yoy_single.get("revenue"),
        "net_profit_single_yoy": m.yoy_single.get("net_profit"),
        "revenue_qoq": m.qoq_single.get("revenue"),
        "net_profit_qoq": m.qoq_single.get("net_profit"),
        "gross_margin": m.ratios_cumulative.get("gross_margin"),
        "net_margin": m.ratios_cumulative.get("net_margin"),
        "deducted_net_margin": m.ratios_cumulative.get("deducted_net_margin"),
        "gross_margin_single": m.ratios_single.get("gross_margin"),
        "net_margin_single": m.ratios_single.get("net_margin"),
        "roe_diluted": m.balance_ratios.get("roe_diluted"),
        "selling_ratio": m.ratios_cumulative.get("selling_ratio"),
        "admin_ratio": m.ratios_cumulative.get("admin_ratio"),
        "rd_ratio": m.ratios_cumulative.get("rd_ratio"),
        "finance_ratio": m.ratios_cumulative.get("finance_ratio"),
        "expense_ratio": m.ratios_cumulative.get("expense_ratio"),
        "gross_margin_change": m.ratio_change_cumulative.get("gross_margin"),
        "net_margin_change": m.ratio_change_cumulative.get("net_margin"),
        "selling_ratio_change": m.ratio_change_cumulative.get("selling_ratio"),
        "debt_ratio": m.balance_ratios.get("debt_ratio"),
        "inventory_days": m.balance_ratios.get("inventory_days"),
        "receivable_days": m.balance_ratios.get("receivable_days"),
        "cash_conversion": cash_conversion,
        "total_assets": cum.get("total_assets"),
        "equity_parent": cum.get("equity_parent"),
    }


def format_value(value: Number, metric: MetricDef, signed: bool = False) -> str:
    if value is None:
        return "—"
    if metric.unit == "亿元":
        return f"{value:,.2f}"
    if metric.unit in ("%", "pct"):
        sign = "+" if signed and value > 0 else ""
        return f"{sign}{value:.1f}{'%' if metric.unit == '%' else ' pct'}"
    if metric.unit == "天":
        return f"{value:.0f}"
    return f"{value:.2f}"
