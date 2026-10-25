"""报告期解析与季度工具。

内部统一使用 period_end = 'YYYY-MM-DD'（03-31 / 06-30 / 09-30 / 12-31）。
"""

import re
from dataclasses import dataclass
from datetime import date, datetime

QUARTER_END = {1: "03-31", 2: "06-30", 3: "09-30", 4: "12-31"}
MONTH_TO_QUARTER = {3: 1, 6: 2, 9: 3, 12: 4}

REPORT_LABELS = {1: "一季报", 2: "中报", 3: "三季报", 4: "年报"}
CUMULATIVE_DAYS = {1: 90, 2: 180, 3: 270, 4: 360}

_DATE_PATTERNS = [
    re.compile(r"^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$"),
    re.compile(r"^(\d{4})(\d{2})(\d{2})$"),
]
_QUARTER_PATTERNS = [
    (re.compile(r"^(\d{4})\s*[-_/]?\s*Q([1-4])$", re.IGNORECASE), None),
    (re.compile(r"^(\d{4})\s*年?\s*(一季报|一季度|第一季度|1季报)$"), 1),
    (re.compile(r"^(\d{4})\s*年?\s*(中报|半年报|二季度|上半年|H1)$", re.IGNORECASE), 2),
    (re.compile(r"^(\d{4})\s*年?\s*(三季报|三季度|第三季度|前三季度|3季报)$"), 3),
    (re.compile(r"^(\d{4})\s*年?\s*(年报|年度|全年|A|FY)$", re.IGNORECASE), 4),
]


@dataclass(frozen=True, order=True)
class Period:
    year: int
    quarter: int

    @property
    def period_end(self) -> str:
        return f"{self.year}-{QUARTER_END[self.quarter]}"

    @property
    def label(self) -> str:
        """如 '2024 年报'、'2024 年三季报'"""
        return f"{self.year} 年{REPORT_LABELS[self.quarter]}" if self.quarter != 4 else f"{self.year} 年报"

    @property
    def quarter_label(self) -> str:
        return f"{self.year}Q{self.quarter}"

    @property
    def cumulative_days(self) -> int:
        return CUMULATIVE_DAYS[self.quarter]

    def previous_quarter(self) -> "Period":
        if self.quarter == 1:
            return Period(self.year - 1, 4)
        return Period(self.year, self.quarter - 1)

    def previous_year(self) -> "Period":
        return Period(self.year - 1, self.quarter)

    @classmethod
    def from_period_end(cls, period_end: str) -> "Period":
        year, month, _ = period_end.split("-")
        return cls(int(year), MONTH_TO_QUARTER[int(month)])


def parse_period(raw: object) -> Period | None:
    """把各种报告期写法解析为 Period；无法解析返回 None。"""
    if raw is None:
        return None
    if isinstance(raw, datetime):
        raw = raw.date()
    if isinstance(raw, date):
        return _from_ymd(raw.year, raw.month, raw.day)
    if isinstance(raw, (int, float)):
        text = str(int(raw))
    else:
        text = str(raw).strip()
    if not text:
        return None

    for pattern in _DATE_PATTERNS:
        match = pattern.match(text)
        if match:
            year, month, day = (int(g) for g in match.groups())
            return _from_ymd(year, month, day)

    for pattern, quarter in _QUARTER_PATTERNS:
        match = pattern.match(text)
        if match:
            year = int(match.group(1))
            q = quarter if quarter is not None else int(match.group(2))
            return Period(year, q)
    return None


def _from_ymd(year: int, month: int, day: int) -> Period | None:
    if month not in MONTH_TO_QUARTER:
        return None
    if year < 1990 or year > 2100:
        return None
    return Period(year, MONTH_TO_QUARTER[month])


def is_period_like(raw: object) -> bool:
    return parse_period(raw) is not None
