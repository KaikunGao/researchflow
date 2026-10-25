import io

from openpyxl import Workbook

from app.services.fields import match_field, normalize_indicator_name, to_yi
from app.services.parser import ParseError, parse_file
from app.services.periods import Period, parse_period


def _xlsx(rows: list[list[object]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_period_parsing_variants():
    assert parse_period("2024-12-31") == Period(2024, 4)
    assert parse_period("2024/09/30") == Period(2024, 3)
    assert parse_period("20240630") == Period(2024, 2)
    assert parse_period("2024年3月31日") == Period(2024, 1)
    assert parse_period("2024Q3") == Period(2024, 3)
    assert parse_period("2024年报") == Period(2024, 4)
    assert parse_period("2024中报") == Period(2024, 2)
    assert parse_period("营业收入") is None
    assert parse_period("2024-05-31") is None


def test_field_alias_matching():
    assert match_field("营业收入(元)") == "revenue"
    assert match_field("营业总收入") == "revenue"
    assert match_field("归属母公司股东的净利润") == "net_profit"
    assert match_field("扣除非经常性损益后的净利润") == "net_profit_deducted"
    assert match_field("营业总成本") is None
    assert match_field("每股收益") is None
    assert normalize_indicator_name(" 营业收入 （万元） ") == "营业收入"


def test_unit_conversion():
    assert to_yi(1e8, "元") == 1.0
    assert to_yi(10000, "万元") == 1.0
    assert to_yi(2.5, "亿元") == 2.5
    assert to_yi(1e8, None, "元") == 1.0


def test_parse_wind_wide_layout():
    rows = [
        ["数据来源：Wind  单位：万元"],
        ["证券代码", "证券简称", "指标名称", "2024-03-31", "2024-06-30", "2024-09-30"],
        ["600276.SH", "恒瑞医药", "营业收入", 600000, 1360000, 2010000],
        ["600276.SH", "恒瑞医药", "归属母公司股东的净利润", 138000, 342000, 462000],
        ["600276.SH", "恒瑞医药", "每股收益(摊薄)", 0.21, 0.53, 0.72],
        ["300760.SZ", "迈瑞医疗", "营业收入(元)", 9_373_000_000, 20_531_000_000, "--"],
    ]
    result = parse_file("wind.xlsx", _xlsx(rows))
    assert result.layout == "wide"
    assert result.company_count == 2
    assert result.period_count == 3
    by_key = {(f.code, f.period_end, f.field): f.value for f in result.facts}
    assert by_key[("600276.SH", "2024-03-31", "revenue")] == 60.0
    assert by_key[("600276.SH", "2024-09-30", "net_profit")] == 46.2
    assert abs(by_key[("300760.SZ", "2024-06-30", "revenue")] - 205.31) < 1e-6
    assert ("300760.SZ", "2024-09-30", "revenue") not in by_key
    assert "每股收益(摊薄)" in result.unmapped_indicators


def test_parse_long_layout_csv_with_gbk():
    text = "证券代码,证券简称,报告期,营业收入(元),归母净利润(元),资产总计(元)\n000661.SZ,长春高新,2023-12-31,14566000000,4523000000,30000000000\n000661,长春高新,2024-03-31,3150000000,1050000000,31000000000\n"
    result = parse_file("choice.csv", text.encode("gb18030"))
    assert result.layout == "long"
    codes = {f.code for f in result.facts}
    assert codes == {"000661.SZ"}
    by_key = {(f.period_end, f.field): f.value for f in result.facts}
    assert abs(by_key[("2023-12-31", "revenue")] - 145.66) < 1e-6
    assert abs(by_key[("2024-03-31", "total_assets")] - 310.0) < 1e-6


def test_single_company_sheet_uses_sheet_title():
    rows = [
        ["恒瑞医药(600276.SH) 财务摘要", None, None],
        ["单位：亿元"],
        ["指标", "2023-12-31", "2024-12-31"],
        ["营业收入", 228.2, 279.8],
        ["归母净利润", 43.0, 63.4],
    ]
    result = parse_file("single.xlsx", _xlsx(rows))
    assert {f.code for f in result.facts} == {"600276.SH"}
    assert {f.name for f in result.facts} == {"恒瑞医药"}
    assert any(f.field == "revenue" and f.value == 279.8 for f in result.facts)


def test_unrecognized_file_raises():
    try:
        parse_file("bad.xlsx", _xlsx([["a", "b"], [1, 2]]))
    except ParseError as exc:
        assert "未识别" in str(exc)
    else:
        raise AssertionError("expected ParseError")
