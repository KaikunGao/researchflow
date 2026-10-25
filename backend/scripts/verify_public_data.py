"""验证公开数据源：拉取恒瑞医药，用两种独立方式核对计算口径。

1. 与年报公告核对：2023 / 2024 年度报告披露的营收、归母净利润、扣非净利润及同比；
2. 与数据源自带的同比字段交叉核对：东方财富每个科目都附带 *_YOY，
   我们用相邻年度自行计算的同比应与之一致（误差 < 0.1 pct）。

运行：python scripts/verify_public_data.py [代码，默认 600276.SH]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import requests  # noqa: E402

from app.services.metrics import build_series  # noqa: E402
from app.services.public_data import BASE, HEADERS, TIMEOUT, _detect_company_type, _em_symbol, fetch_company  # noqa: E402

# 年报公告口径（单位：亿元；同比：%）。来源：恒瑞医药 2023 / 2024 年度报告「主要会计数据」。
ANNUAL_REPORT = {
    "600276.SH": {
        "2023-12-31": {"revenue": 228.20, "net_profit": 43.02, "net_profit_deducted": 41.41},
        "2024-12-31": {"revenue": 279.85, "net_profit": 63.37, "net_profit_deducted": 61.78, "revenue_yoy": 22.63, "net_profit_yoy": 47.28},
    }
}


def main(code: str) -> int:
    print(f"== 拉取 {code}（2022 年起）")
    result = fetch_company(code, 2022)
    print(f"   公司：{result.name}，报告期 {len(result.periods)} 个，事实 {len(result.facts)} 条")
    facts: dict[str, dict[str, float]] = {}
    for f in result.facts:
        facts.setdefault(f.period_end, {})[f.field] = f.value
    series = {m.period_end: m for m in build_series(facts)}
    failures = 0

    expected = ANNUAL_REPORT.get(code, {})
    if expected:
        print("\n== 核对 1：与年报公告披露值比较（亿元）")
        for period, items in expected.items():
            m = series.get(period)
            if not m:
                print(f"   {period} 缺少数据"); failures += 1; continue
            for key, want in items.items():
                if key.endswith("_yoy"):
                    got = m.yoy_cumulative.get(key.replace("_yoy", ""))
                    ok = got is not None and abs(got - want) < 0.05
                    print(f"   {period} {key:22s} 公告 {want:>8.2f}%  计算 {got if got is None else round(got, 2):>8}%  {'✓' if ok else '✗'}")
                else:
                    got = m.cumulative.get(key)
                    ok = got is not None and abs(got - want) < 0.01
                    print(f"   {period} {key:22s} 公告 {want:>8.2f}   拉取 {got if got is None else round(got, 2):>8}   {'✓' if ok else '✗'}")
                failures += 0 if ok else 1
    else:
        print("\n== 核对 1 跳过：没有该公司的年报公告对照数据")

    print("\n== 核对 2：自算同比 vs 东方财富自带同比字段（利润表 2024 年报）")
    session = requests.Session()
    symbol = _em_symbol(code)
    ctype = _detect_company_type(session, symbol)
    data = session.get(f"{BASE}/lrbAjaxNew", params={"companyType": ctype, "reportDateType": "0", "reportType": "1", "code": symbol, "dates": "2024-12-31,2024-09-30"}, headers=HEADERS, timeout=TIMEOUT).json()["data"]
    for row in data:
        period = row["REPORT_DATE"][:10]
        m = series.get(period)
        if not m:
            continue
        for key, col in (("revenue", "TOTAL_OPERATE_INCOME_YOY"), ("net_profit", "PARENT_NETPROFIT_YOY"), ("net_profit_deducted", "DEDUCT_PARENT_NETPROFIT_YOY")):
            theirs, ours = row.get(col), m.yoy_cumulative.get(key)
            if theirs is None or ours is None:
                continue
            ok = abs(float(theirs) - ours) < 0.1
            print(f"   {period} {key:22s} 东方财富 {float(theirs):>8.2f}%  自算 {ours:>8.2f}%  {'✓' if ok else '✗'}")
            failures += 0 if ok else 1

    print("\n== 单季度拆分抽查（2024Q4 单季 = 年报 − 三季报）")
    q4 = series.get("2024-12-31")
    if q4:
        print(f"   营收 {q4.single.get('revenue')} 亿，同比 {q4.yoy_single.get('revenue')}%，环比 {q4.qoq_single.get('revenue')}%")

    print("\n结果：", "全部通过 ✓" if failures == 0 else f"{failures} 项不一致 ✗")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "600276.SH"))
