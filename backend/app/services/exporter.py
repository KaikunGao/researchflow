"""标准底表导出（Excel）。

每家公司一个工作表，报告期横向排列，分四个区块：
累计口径（亿元）、单季度（亿元）、比率（%）、同比 / 环比（%）。
另附「说明」工作表记录口径。
"""

import io

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from app.services.commentary import METHODOLOGY_NOTE
from app.services.fields import FIELD_MAP, FLOW_FIELDS, STOCK_FIELDS
from app.services.metrics import PeriodMetrics

RATIO_LABELS = {
    "gross_margin": "毛利率",
    "net_margin": "净利率",
    "deducted_net_margin": "扣非净利率",
    "selling_ratio": "销售费用率",
    "admin_ratio": "管理费用率",
    "rd_ratio": "研发费用率",
    "finance_ratio": "财务费用率",
    "expense_ratio": "期间费用率",
}
BALANCE_LABELS = {
    "debt_ratio": "资产负债率",
    "roe_diluted": "ROE（摊薄）",
    "inventory_days": "存货周转天数",
    "receivable_days": "应收账款周转天数",
}
GROWTH_LABELS = {
    "revenue": "营业收入",
    "net_profit": "归母净利润",
    "net_profit_deducted": "扣非归母净利润",
    "operating_cash_flow": "经营活动现金流净额",
}

_HEADER_FILL = PatternFill("solid", fgColor="1E3A8A")
_HEADER_FONT = Font(color="FFFFFF", bold=True)
_BLOCK_FILL = PatternFill("solid", fgColor="E8EDF7")
_BLOCK_FONT = Font(bold=True, color="1E3A8A")


def build_workbook(companies: list[tuple[dict, list[PeriodMetrics]]]) -> bytes:
    wb = Workbook()
    wb.remove(wb.active)

    for company, series in companies:
        title = f"{company['name']}({company['code']})"[:31].replace("/", "-")
        ws = wb.create_sheet(title=title)
        ws["A1"] = f"{company['name']}（{company['code']}）财务跟踪底表"
        ws["A1"].font = Font(bold=True, size=13)
        ws["A2"] = "单位：亿元 / %；由 ResearchFlow 自动生成"
        ws["A2"].font = Font(color="666666", size=9)

        header_row = 4
        ws.cell(row=header_row, column=1, value="指标")
        for j, m in enumerate(series, start=2):
            cell = ws.cell(row=header_row, column=j, value=m.period_end)
            cell.alignment = Alignment(horizontal="center")
        for j in range(1, len(series) + 2):
            c = ws.cell(row=header_row, column=j)
            c.fill = _HEADER_FILL
            c.font = _HEADER_FONT

        row = header_row + 1
        row = _block(ws, row, "累计口径（亿元）", [(FIELD_MAP[k].label, [m.cumulative.get(k) for m in series]) for k in FLOW_FIELDS], "0.00")
        row = _block(ws, row, "资产负债表（亿元，期末）", [(FIELD_MAP[k].label, [m.cumulative.get(k) for m in series]) for k in STOCK_FIELDS], "0.00")
        row = _block(ws, row, "单季度（亿元）", [(FIELD_MAP[k].label, [m.single.get(k) for m in series]) for k in FLOW_FIELDS], "0.00")
        row = _block(ws, row, "累计同比（%）", [(GROWTH_LABELS[k], [m.yoy_cumulative.get(k) for m in series]) for k in GROWTH_LABELS], "0.0")
        row = _block(ws, row, "单季度同比（%）", [(GROWTH_LABELS[k], [m.yoy_single.get(k) for m in series]) for k in GROWTH_LABELS], "0.0")
        row = _block(ws, row, "单季度环比（%）", [(GROWTH_LABELS[k], [m.qoq_single.get(k) for m in series]) for k in ("revenue", "net_profit", "net_profit_deducted")], "0.0")
        row = _block(ws, row, "累计比率（%）", [(RATIO_LABELS[k], [m.ratios_cumulative.get(k) for m in series]) for k in RATIO_LABELS], "0.00")
        row = _block(ws, row, "单季度比率（%）", [(RATIO_LABELS[k], [m.ratios_single.get(k) for m in series]) for k in RATIO_LABELS], "0.00")
        row = _block(ws, row, "资产质量", [(BALANCE_LABELS[k], [m.balance_ratios.get(k) for m in series]) for k in BALANCE_LABELS], "0.00")

        ws.column_dimensions["A"].width = 24
        for j in range(2, len(series) + 2):
            ws.column_dimensions[get_column_letter(j)].width = 13
        ws.freeze_panes = ws.cell(row=header_row + 1, column=2)

    note = wb.create_sheet(title="说明")
    note["A1"] = "口径说明"
    note["A1"].font = Font(bold=True, size=13)
    note["A2"] = METHODOLOGY_NOTE
    note["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    note.column_dimensions["A"].width = 110
    note.row_dimensions[2].height = 90

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def _block(ws, row: int, title: str, lines: list[tuple[str, list]], number_format: str) -> int:
    cell = ws.cell(row=row, column=1, value=title)
    cell.fill = _BLOCK_FILL
    cell.font = _BLOCK_FONT
    for j in range(2, ws.max_column + 1):
        ws.cell(row=row, column=j).fill = _BLOCK_FILL
    row += 1
    for label, values in lines:
        ws.cell(row=row, column=1, value=label)
        for j, v in enumerate(values, start=2):
            c = ws.cell(row=row, column=j, value=v)
            c.number_format = number_format
            c.alignment = Alignment(horizontal="right")
        row += 1
    return row + 1
