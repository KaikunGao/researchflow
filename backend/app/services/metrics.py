"""财务指标计算：单季度拆分、同比 / 环比、比率。

口径说明：
- 累计口径：利润表 / 现金流量表字段按报告期累计（Q3 = 1–9 月）。
- 单季度：Q1 = Q1 累计；Qn = Qn 累计 − Q(n-1) 累计，缺少上一期累计时为 None。
- 同比：与上年同期比较，(本期 − 上年同期) / |上年同期|。
- 环比：单季度与上一季度比较，要求两个季度连续。
- 比率均为百分比；费用率 = 费用 / 营业收入。
- ROE 采用期末归母净资产的摊薄口径（累计净利润 / 期末归母净资产），仅作参考。
- 周转天数 = 期末余额 / 累计成本（或收入） × 报告期天数（90 / 180 / 270 / 360）。
"""

from dataclasses import dataclass, field

from app.services.fields import FLOW_FIELDS, STOCK_FIELDS
from app.services.periods import Period

RATIO_KEYS = (
    "gross_margin",
    "net_margin",
    "deducted_net_margin",
    "selling_ratio",
    "admin_ratio",
    "rd_ratio",
    "finance_ratio",
    "expense_ratio",
)
GROWTH_KEYS = ("revenue", "net_profit", "net_profit_deducted", "operating_cash_flow")

Number = float | None


@dataclass
class PeriodMetrics:
    period_end: str
    year: int
    quarter: int
    label: str
    quarter_label: str
    cumulative: dict[str, Number] = field(default_factory=dict)
    single: dict[str, Number] = field(default_factory=dict)
    ratios_cumulative: dict[str, Number] = field(default_factory=dict)
    ratios_single: dict[str, Number] = field(default_factory=dict)
    yoy_cumulative: dict[str, Number] = field(default_factory=dict)
    yoy_single: dict[str, Number] = field(default_factory=dict)
    qoq_single: dict[str, Number] = field(default_factory=dict)
    ratio_change_cumulative: dict[str, Number] = field(default_factory=dict)
    ratio_change_single: dict[str, Number] = field(default_factory=dict)
    balance_ratios: dict[str, Number] = field(default_factory=dict)


def build_series(facts_by_period: dict[str, dict[str, float]]) -> list[PeriodMetrics]:
    """facts_by_period: {period_end: {field: value(亿元)}} → 按时间排序的指标序列。"""
    periods = sorted(Period.from_period_end(p) for p in facts_by_period)
    lookup = {p: facts_by_period[p.period_end] for p in periods}

    # 第一遍：累计值与单季度
    single_lookup: dict[Period, dict[str, Number]] = {}
    result: dict[Period, PeriodMetrics] = {}
    for p in periods:
        cum = lookup[p]
        prev_q = lookup.get(p.previous_quarter()) if p.quarter > 1 else None
        single: dict[str, Number] = {}
        for key in FLOW_FIELDS:
            cur = cum.get(key)
            if cur is None:
                single[key] = None
            elif p.quarter == 1:
                single[key] = cur
            elif prev_q is not None and prev_q.get(key) is not None:
                single[key] = round(cur - prev_q[key], 4)
            else:
                single[key] = None
        single_lookup[p] = single
        result[p] = PeriodMetrics(
            period_end=p.period_end,
            year=p.year,
            quarter=p.quarter,
            label=p.label,
            quarter_label=p.quarter_label,
            cumulative={key: cum.get(key) for key in FLOW_FIELDS + STOCK_FIELDS},
            single=single,
            ratios_cumulative=_ratios(cum),
            ratios_single=_ratios(single),
            balance_ratios=_balance_ratios(cum, p),
        )

    # 第二遍：同比、环比、比率变化
    for p in periods:
        m = result[p]
        last_year = result.get(p.previous_year())
        prev_q = result.get(p.previous_quarter())
        for key in GROWTH_KEYS:
            m.yoy_cumulative[key] = _growth(m.cumulative.get(key), last_year.cumulative.get(key) if last_year else None)
            m.yoy_single[key] = _growth(m.single.get(key), last_year.single.get(key) if last_year else None)
            m.qoq_single[key] = _growth(m.single.get(key), prev_q.single.get(key) if prev_q else None)
        for key in RATIO_KEYS:
            m.ratio_change_cumulative[key] = _diff(
                m.ratios_cumulative.get(key), last_year.ratios_cumulative.get(key) if last_year else None
            )
            m.ratio_change_single[key] = _diff(
                m.ratios_single.get(key), last_year.ratios_single.get(key) if last_year else None
            )
    return [result[p] for p in periods]


def _ratios(values: dict[str, Number]) -> dict[str, Number]:
    revenue = values.get("revenue")
    cost = values.get("operating_cost")
    out: dict[str, Number] = {}
    out["gross_margin"] = _pct(revenue - cost, revenue) if revenue is not None and cost is not None else None
    out["net_margin"] = _pct(values.get("net_profit"), revenue)
    out["deducted_net_margin"] = _pct(values.get("net_profit_deducted"), revenue)
    out["selling_ratio"] = _pct(values.get("selling_expense"), revenue)
    out["admin_ratio"] = _pct(values.get("admin_expense"), revenue)
    out["rd_ratio"] = _pct(values.get("rd_expense"), revenue)
    out["finance_ratio"] = _pct(values.get("finance_expense"), revenue)
    expenses = [values.get(k) for k in ("selling_expense", "admin_expense", "rd_expense", "finance_expense")]
    present = [e for e in expenses if e is not None]
    out["expense_ratio"] = _pct(sum(present), revenue) if present else None
    return out


def _balance_ratios(cum: dict[str, Number], p: Period) -> dict[str, Number]:
    out: dict[str, Number] = {}
    out["debt_ratio"] = _pct(cum.get("total_liabilities"), cum.get("total_assets"))
    out["roe_diluted"] = _pct(cum.get("net_profit"), cum.get("equity_parent"))
    days = p.cumulative_days
    out["inventory_days"] = _days(cum.get("inventory"), cum.get("operating_cost"), days)
    out["receivable_days"] = _days(cum.get("accounts_receivable"), cum.get("revenue"), days)
    return out


def _pct(numerator: Number, denominator: Number) -> Number:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return round(numerator / denominator * 100, 2)


def _growth(current: Number, previous: Number) -> Number:
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 2)


def _diff(current: Number, previous: Number) -> Number:
    if current is None or previous is None:
        return None
    return round(current - previous, 2)


def _days(balance: Number, flow: Number, days: int) -> Number:
    if balance is None or flow is None or flow <= 0:
        return None
    return round(balance / flow * days, 1)
