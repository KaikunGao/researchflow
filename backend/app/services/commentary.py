"""财报点评数据段落生成（模板化，不依赖大模型）。"""

from app.services.metrics import PeriodMetrics

Number = float | None


def _yi(value: Number) -> str:
    return "—" if value is None else f"{value:.2f} 亿元"


def _pct(value: Number, signed: bool = True) -> str:
    if value is None:
        return "—"
    sign = "+" if signed and value > 0 else ""
    return f"{sign}{value:.1f}%"


def _pp(value: Number) -> str:
    if value is None:
        return "—"
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.1f} pct"


def _growth_phrase(value: Number) -> str:
    """把增速写成'同比 +12.3%'或'同比下降 5.2%'的口语化表达。"""
    if value is None:
        return "同比数据缺失"
    if value >= 0:
        return f"同比 +{value:.1f}%"
    return f"同比 -{abs(value):.1f}%"


def _change_phrase(value: Number) -> str:
    if value is None:
        return "同比变化缺失"
    if abs(value) < 0.05:
        return "同比基本持平"
    direction = "提升" if value > 0 else "下降"
    return f"同比{direction} {abs(value):.1f} pct"


def build_commentary(name: str, code: str, m: PeriodMetrics) -> str:
    """生成一段可直接粘贴进点评的数据描述。缺失的数据会自动略过对应从句。"""
    cum, yoy = m.cumulative, m.yoy_cumulative
    rc, rchg = m.ratios_cumulative, m.ratio_change_cumulative
    sg, syoy, sqoq = m.single, m.yoy_single, m.qoq_single
    rs = m.ratios_single

    paragraphs: list[str] = []

    # 第一段：累计口径核心数据
    clauses: list[str] = []
    if cum.get("revenue") is not None:
        clauses.append(f"实现营业收入 {_yi(cum['revenue'])}，{_growth_phrase(yoy.get('revenue'))}")
    if cum.get("net_profit") is not None:
        clauses.append(f"归母净利润 {_yi(cum['net_profit'])}，{_growth_phrase(yoy.get('net_profit'))}")
    if cum.get("net_profit_deducted") is not None:
        clauses.append(f"扣非归母净利润 {_yi(cum['net_profit_deducted'])}，{_growth_phrase(yoy.get('net_profit_deducted'))}")
    if clauses:
        paragraphs.append(f"{name}（{code}）发布 {m.label}：" + "；".join(clauses) + "。")

    # 第二段：盈利能力与费用率
    profit_clauses: list[str] = []
    if rc.get("gross_margin") is not None:
        profit_clauses.append(f"毛利率 {_pct(rc['gross_margin'], signed=False)}，{_change_phrase(rchg.get('gross_margin'))}")
    if rc.get("net_margin") is not None:
        profit_clauses.append(f"净利率 {_pct(rc['net_margin'], signed=False)}，{_change_phrase(rchg.get('net_margin'))}")
    expense_bits: list[str] = []
    for key, label in (("selling_ratio", "销售费用率"), ("admin_ratio", "管理费用率"), ("rd_ratio", "研发费用率"), ("finance_ratio", "财务费用率")):
        if rc.get(key) is not None:
            expense_bits.append(f"{label} {_pct(rc[key], signed=False)}（{_pp(rchg.get(key))}）")
    if expense_bits:
        profit_clauses.append("期间费用方面，" + "、".join(expense_bits))
    if profit_clauses:
        paragraphs.append("盈利能力方面，" + "；".join(profit_clauses) + "。")

    # 第三段：单季度
    q_clauses: list[str] = []
    if sg.get("revenue") is not None:
        q = f"{m.quarter_label} 单季度实现营业收入 {_yi(sg['revenue'])}，{_growth_phrase(syoy.get('revenue'))}"
        if sqoq.get("revenue") is not None:
            q += f"，环比 {_pct(sqoq['revenue'])}"
        q_clauses.append(q)
    if sg.get("net_profit") is not None:
        q = f"归母净利润 {_yi(sg['net_profit'])}，{_growth_phrase(syoy.get('net_profit'))}"
        if sqoq.get("net_profit") is not None:
            q += f"，环比 {_pct(sqoq['net_profit'])}"
        q_clauses.append(q)
    if rs.get("gross_margin") is not None:
        q_clauses.append(f"单季度毛利率 {_pct(rs['gross_margin'], signed=False)}，{_change_phrase(m.ratio_change_single.get('gross_margin'))}")
    if q_clauses:
        paragraphs.append("分季度看，" + "；".join(q_clauses) + "。")

    # 第四段：现金流与资产负债
    tail: list[str] = []
    if cum.get("operating_cash_flow") is not None:
        ocf = cum["operating_cash_flow"]
        phrase = f"经营活动现金流净额 {_yi(ocf)}"
        if yoy.get("operating_cash_flow") is not None:
            phrase += f"，{_growth_phrase(yoy['operating_cash_flow'])}"
        if cum.get("net_profit") not in (None, 0) and ocf is not None:
            ratio = ocf / cum["net_profit"]
            phrase += f"，净现比 {ratio:.2f}"
        tail.append(phrase)
    br = m.balance_ratios
    if br.get("debt_ratio") is not None:
        tail.append(f"资产负债率 {_pct(br['debt_ratio'], signed=False)}")
    if br.get("receivable_days") is not None:
        tail.append(f"应收账款周转天数 {br['receivable_days']:.0f} 天")
    if br.get("inventory_days") is not None:
        tail.append(f"存货周转天数 {br['inventory_days']:.0f} 天")
    if tail:
        paragraphs.append("现金流与资产质量方面，" + "；".join(tail) + "。")

    return "\n".join(paragraphs) if paragraphs else "当前报告期缺少可用于生成点评的核心数据。"


METHODOLOGY_NOTE = (
    "口径说明：金额单位为亿元；利润表与现金流量表为累计口径，单季度由相邻报告期累计值差分得到；"
    "同比对比上年同期，环比对比上一季度；费用率 = 费用 / 营业收入；ROE 为累计净利润 / 期末归母净资产的摊薄口径；"
    "周转天数 = 期末余额 / 累计成本（收入）× 报告期天数。数据来源于导入文件，请在发布前复核。"
)
