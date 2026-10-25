"""公开数据源：东方财富 F10 财务报表（利润表 / 资产负债表 / 现金流量表，按报告期）。

与 Wind 导出相同，取得的是累计口径、单位为元的原始科目，统一转换为 ParsedFact（亿元）
后走同一套标准化与指标计算流程。

接口为东方财富网页端使用的公开 JSON 接口，无需账号；若接口变动，请在此文件集中修改。
"""

import re
from dataclasses import dataclass, field

import requests

from app.services.parser import ParsedFact
from app.services.periods import parse_period

BASE = "https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis"
HEADERS = {"User-Agent": "Mozilla/5.0 (ResearchFlow; +https://localhost)", "Referer": "https://emweb.securities.eastmoney.com/"}
TIMEOUT = 20
CHUNK = 5  # 东方财富每次最多返回 5 个报告期

# 三张表：(日期接口, 数据接口, 字段映射 {标准字段: [候选列名]})
STATEMENTS: dict[str, tuple[str, str, dict[str, list[str]]]] = {
    "利润表": (
        "lrbDateAjaxNew",
        "lrbAjaxNew",
        {
            "revenue": ["TOTAL_OPERATE_INCOME", "OPERATE_INCOME"],
            "operating_cost": ["OPERATE_COST"],
            "net_profit": ["PARENT_NETPROFIT"],
            "net_profit_deducted": ["DEDUCT_PARENT_NETPROFIT"],
            "selling_expense": ["SALE_EXPENSE"],
            "admin_expense": ["MANAGE_EXPENSE"],
            "rd_expense": ["RESEARCH_EXPENSE"],
            "finance_expense": ["FINANCE_EXPENSE"],
        },
    ),
    "资产负债表": (
        "zcfzbDateAjaxNew",
        "zcfzbAjaxNew",
        {
            "total_assets": ["TOTAL_ASSETS"],
            "total_liabilities": ["TOTAL_LIABILITIES"],
            "equity_parent": ["TOTAL_PARENT_EQUITY"],
            "inventory": ["INVENTORY"],
            "accounts_receivable": ["ACCOUNTS_RECE", "NOTE_ACCOUNTS_RECE"],
        },
    ),
    "现金流量表": (
        "xjllbDateAjaxNew",
        "xjllbAjaxNew",
        {"operating_cash_flow": ["NETCASH_OPERATE"]},
    ),
}

_CODE_RE = re.compile(r"^(\d{6})(?:\.(SH|SZ|BJ))?$", re.IGNORECASE)


class PublicDataError(RuntimeError):
    """面向用户的错误信息。"""


@dataclass
class FetchResult:
    code: str
    name: str
    facts: list[ParsedFact] = field(default_factory=list)
    periods: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def normalize_code(raw: str) -> str:
    text = raw.strip().upper()
    match = _CODE_RE.match(text)
    if not match:
        raise PublicDataError(f"无法识别证券代码：{raw}（示例：600276.SH 或 300760）")
    digits, suffix = match.groups()
    if not suffix:
        suffix = "SH" if digits.startswith(("6", "9")) else "SZ" if digits.startswith(("0", "2", "3")) else "BJ"
    return f"{digits}.{suffix}"


def _em_symbol(code: str) -> str:
    digits, exchange = code.split(".")
    return f"{exchange}{digits}"


def _get(session: requests.Session, path: str, params: dict) -> dict:
    try:
        resp = session.get(f"{BASE}/{path}", params=params, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise PublicDataError(f"访问东方财富接口失败：{exc.__class__.__name__}") from exc
    except ValueError as exc:
        raise PublicDataError("东方财富接口返回了无法解析的内容，可能接口已变更。") from exc


def _detect_company_type(session: requests.Session, symbol: str) -> str:
    """一般工商企业为 4；银行 / 保险 / 券商有独立报表模板。"""
    try:
        resp = session.get(f"{BASE}/Index", params={"type": "web", "code": symbol.lower()}, headers=HEADERS, timeout=TIMEOUT)
        match = re.search(r'id="hidctype"[^>]*value="(\d)"', resp.text)
        if match:
            return match.group(1)
    except requests.RequestException:
        pass
    return "4"


def fetch_company(code: str, start_year: int, session: requests.Session | None = None) -> FetchResult:
    """拉取一家公司自 start_year 起的三张报表，返回标准化事实。"""
    code = normalize_code(code)
    symbol = _em_symbol(code)
    session = session or requests.Session()
    company_type = _detect_company_type(session, symbol)
    result = FetchResult(code=code, name=code)
    seen_periods: set[str] = set()

    for statement, (date_path, data_path, mapping) in STATEMENTS.items():
        date_json = _get(session, date_path, {"companyType": company_type, "reportDateType": "0", "code": symbol})
        dates = [d["REPORT_DATE"][:10] for d in date_json.get("data") or []]
        dates = [d for d in dates if int(d[:4]) >= start_year and parse_period(d) is not None]
        if not dates:
            result.warnings.append(f"{statement}：{code} 自 {start_year} 年起没有可用报告期。")
            continue
        rows: list[dict] = []
        for i in range(0, len(dates), CHUNK):
            chunk = ",".join(dates[i : i + CHUNK])
            data_json = _get(
                session,
                data_path,
                {"companyType": company_type, "reportDateType": "0", "reportType": "1", "code": symbol, "dates": chunk},
            )
            rows.extend(data_json.get("data") or [])
        if not rows:
            result.warnings.append(f"{statement}：{code} 接口未返回数据。")
            continue
        for row in rows:
            period = parse_period(str(row.get("REPORT_DATE", ""))[:10])
            if period is None:
                continue
            name = row.get("SECURITY_NAME_ABBR")
            if name:
                result.name = str(name).strip()
            for key, candidates in mapping.items():
                value = next((row[c] for c in candidates if row.get(c) is not None), None)
                if value is None:
                    continue
                try:
                    number = float(value)
                except (TypeError, ValueError):
                    continue
                result.facts.append(ParsedFact(code, result.name, period.period_end, key, round(number / 1e8, 6)))
                seen_periods.add(period.period_end)

    if not result.facts:
        raise PublicDataError(f"{code}：未能从东方财富获取任何财务数据，请确认代码正确且为 A 股上市公司。")
    result.periods = sorted(seen_periods)
    return result


def fetch_many(codes: list[str], start_year: int) -> tuple[list[FetchResult], list[str]]:
    """逐家拉取；单家失败不影响其他公司，错误汇总到 warnings。"""
    session = requests.Session()
    results: list[FetchResult] = []
    errors: list[str] = []
    for raw in codes:
        try:
            results.append(fetch_company(raw, start_year, session))
        except PublicDataError as exc:
            errors.append(str(exc))
    return results, errors
