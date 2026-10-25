"""标准化字段定义与别名映射。

所有金额字段统一存储为 **亿元**；"flow" 类字段来自利润表 / 现金流量表，为累计口径，可拆单季度；
"stock" 类字段来自资产负债表，为时点数，不拆分。
"""

import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class FieldDefinition:
    key: str
    label: str
    kind: str  # "flow" | "stock"
    aliases: tuple[str, ...] = field(default_factory=tuple)


FIELD_DEFINITIONS: list[FieldDefinition] = [
    FieldDefinition("revenue", "营业收入", "flow", ("营业收入", "营业总收入", "主营业务收入", "营收")),
    FieldDefinition("operating_cost", "营业成本", "flow", ("营业成本", "主营业务成本")),
    FieldDefinition(
        "net_profit",
        "归母净利润",
        "flow",
        (
            "归母净利润",
            "归属于母公司所有者的净利润",
            "归属于母公司股东的净利润",
            "归属母公司股东的净利润",
            "归属母公司所有者的净利润",
            "归属于上市公司股东的净利润",
            "净利润(归母)",
            "归属于母公司净利润",
        ),
    ),
    FieldDefinition(
        "net_profit_deducted",
        "扣非归母净利润",
        "flow",
        (
            "扣非净利润",
            "扣非归母净利润",
            "归母扣非净利润",
            "扣除非经常性损益后的净利润",
            "扣除非经常性损益的净利润",
            "归属于上市公司股东的扣除非经常性损益的净利润",
            "扣除非经常性损益后归属于母公司所有者的净利润",
            "扣除非经常性损益后归属母公司股东的净利润",
        ),
    ),
    FieldDefinition("selling_expense", "销售费用", "flow", ("销售费用",)),
    FieldDefinition("admin_expense", "管理费用", "flow", ("管理费用",)),
    FieldDefinition("rd_expense", "研发费用", "flow", ("研发费用", "研发投入")),
    FieldDefinition("finance_expense", "财务费用", "flow", ("财务费用",)),
    FieldDefinition(
        "operating_cash_flow",
        "经营活动现金流净额",
        "flow",
        ("经营活动产生的现金流量净额", "经营活动现金流净额", "经营现金流净额", "经营活动现金流量净额", "经营性现金流净额"),
    ),
    FieldDefinition("total_assets", "总资产", "stock", ("资产总计", "总资产", "资产合计")),
    FieldDefinition("total_liabilities", "总负债", "stock", ("负债合计", "总负债", "负债总计")),
    FieldDefinition(
        "equity_parent",
        "归母净资产",
        "stock",
        (
            "归母净资产",
            "归属于母公司所有者权益",
            "归属于母公司所有者权益合计",
            "归属于母公司股东权益",
            "归属于母公司股东权益合计",
            "归属母公司股东的权益",
            "归属于母公司股东的权益",
            "所有者权益(归母)",
            "股东权益合计(归母)",
        ),
    ),
    FieldDefinition("inventory", "存货", "stock", ("存货", "存货净额")),
    FieldDefinition("accounts_receivable", "应收账款", "stock", ("应收账款", "应收票据及应收账款", "应收账款净额")),
]

FIELD_MAP: dict[str, FieldDefinition] = {f.key: f for f in FIELD_DEFINITIONS}
FLOW_FIELDS: list[str] = [f.key for f in FIELD_DEFINITIONS if f.kind == "flow"]
STOCK_FIELDS: list[str] = [f.key for f in FIELD_DEFINITIONS if f.kind == "stock"]

UNIT_FACTORS: dict[str, float] = {
    "元": 1e-8,
    "万元": 1e-4,
    "百万元": 1e-2,
    "百万": 1e-2,
    "千万元": 1e-1,
    "亿元": 1.0,
    "亿": 1.0,
}

_UNIT_IN_NAME = re.compile(r"[（(]\s*(元|万元|百万元|百万|千万元|亿元|亿)\s*[)）]")
_UNIT_DECL = re.compile(r"单位\s*[:：]?\s*(元|万元|百万元|百万|千万元|亿元|亿)")
_NOISE = re.compile(r"[\s　]+|[（(].*?[)）]|[:：]")

# 按别名长度降序排列，优先匹配更具体的名称
_ALIAS_INDEX: list[tuple[str, str]] = sorted(
    ((alias, f.key) for f in FIELD_DEFINITIONS for alias in f.aliases),
    key=lambda item: len(item[0]),
    reverse=True,
)


def normalize_indicator_name(raw: str) -> str:
    """去掉空白、括号内容（单位 / 口径）与冒号，统一全角括号。"""
    text = str(raw).strip().replace("（", "(").replace("）", ")")
    text = _NOISE.sub("", text)
    return text


def extract_unit(raw: str) -> str | None:
    """从指标名的括号中提取单位，例如 '营业收入(万元)' → '万元'。"""
    match = _UNIT_IN_NAME.search(str(raw).replace("（", "(").replace("）", ")"))
    return match.group(1) if match else None


def extract_unit_declaration(raw: str) -> str | None:
    """从 '单位：万元' 之类的说明文字中提取单位。"""
    match = _UNIT_DECL.search(str(raw))
    return match.group(1) if match else None


def match_field(raw: str) -> str | None:
    """把原始指标名映射到标准字段 key；无法识别返回 None。"""
    name = normalize_indicator_name(raw)
    if not name:
        return None
    for alias, key in _ALIAS_INDEX:
        if name == alias:
            return key
    for alias, key in _ALIAS_INDEX:
        if alias in name and len(alias) >= 4:
            return key
    return None


def to_yi(value: float, unit: str | None, default_unit: str = "元") -> float:
    """按单位把金额转换为亿元。"""
    factor = UNIT_FACTORS.get(unit or default_unit, UNIT_FACTORS[default_unit])
    return value * factor
