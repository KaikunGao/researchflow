from app.services.commentary import build_commentary
from app.services.metrics import build_series


def _facts():
    # 2023：四个季度累计；2024：四个季度累计（营收每季 +10%）
    rev_2023 = [100.0, 220.0, 350.0, 500.0]
    rev_2024 = [110.0, 242.0, 385.0, 550.0]
    np_2023 = [20.0, 44.0, 70.0, 100.0]
    np_2024 = [24.0, 50.0, 80.0, 105.0]
    ends = ["03-31", "06-30", "09-30", "12-31"]
    facts = {}
    for i, end in enumerate(ends):
        facts[f"2023-{end}"] = {"revenue": rev_2023[i], "net_profit": np_2023[i], "operating_cost": rev_2023[i] * 0.4,
                                "selling_expense": rev_2023[i] * 0.2, "total_assets": 1000.0, "total_liabilities": 300.0,
                                "equity_parent": 650.0, "inventory": 80.0, "accounts_receivable": 60.0}
        facts[f"2024-{end}"] = {"revenue": rev_2024[i], "net_profit": np_2024[i], "operating_cost": rev_2024[i] * 0.38,
                                "selling_expense": rev_2024[i] * 0.19, "total_assets": 1100.0, "total_liabilities": 330.0,
                                "equity_parent": 720.0, "inventory": 85.0, "accounts_receivable": 70.0}
    return facts


def test_single_quarter_split_and_growth():
    series = build_series(_facts())
    by = {m.period_end: m for m in series}

    q4_2024 = by["2024-12-31"]
    assert q4_2024.single["revenue"] == 550.0 - 385.0
    assert q4_2024.single["net_profit"] == 105.0 - 80.0
    assert q4_2024.yoy_cumulative["revenue"] == 10.0
    # 2024Q4 单季 165 vs 2023Q4 单季 150 → +10%
    assert q4_2024.yoy_single["revenue"] == 10.0
    # 环比：165 vs 2024Q3 单季 143
    assert abs(q4_2024.qoq_single["revenue"] - (165 - 143) / 143 * 100) < 0.01

    q1_2024 = by["2024-03-31"]
    assert q1_2024.single["revenue"] == 110.0
    # Q1 环比 2023Q4 单季 150
    assert abs(q1_2024.qoq_single["revenue"] - (110 - 150) / 150 * 100) < 0.01

    # 2023 没有上年数据 → 同比为 None；Q1 单季等于累计
    assert by["2023-03-31"].yoy_cumulative["revenue"] is None
    assert by["2023-03-31"].single["revenue"] == 100.0


def test_ratios_and_changes():
    series = build_series(_facts())
    by = {m.period_end: m for m in series}
    m = by["2024-12-31"]
    assert m.ratios_cumulative["gross_margin"] == 62.0
    assert m.ratio_change_cumulative["gross_margin"] == 2.0
    assert m.ratios_cumulative["selling_ratio"] == 19.0
    assert m.balance_ratios["debt_ratio"] == 30.0
    assert m.balance_ratios["roe_diluted"] == round(105 / 720 * 100, 2)
    assert m.balance_ratios["inventory_days"] == round(85 / (550 * 0.38) * 360, 1)


def test_missing_previous_quarter_gives_none():
    facts = {"2024-06-30": {"revenue": 200.0}, "2024-12-31": {"revenue": 500.0}}
    series = build_series(facts)
    by = {m.period_end: m for m in series}
    assert by["2024-06-30"].single["revenue"] is None  # 缺 Q1
    assert by["2024-12-31"].single["revenue"] is None  # 缺 Q3


def test_commentary_contains_key_numbers():
    series = build_series(_facts())
    text = build_commentary("测试公司", "600000.SH", series[-1])
    assert "测试公司（600000.SH）发布 2024 年报" in text
    assert "营业收入 550.00 亿元，同比 +10.0%" in text
    assert "2024Q4 单季度" in text
    assert "毛利率 62.0%" in text
    assert "资产负债率 30.0%" in text
