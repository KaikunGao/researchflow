"""工作区设置（SQLite key-value）。"""

import sqlite3

DEFAULT_SETTINGS: dict[str, str] = {
    "workspace_name": "医药生物研究组",
    "institution_name": "XX证券研究所",
    "data_source_label": "Wind",
    "default_basis": "single",  # single | cumulative
    "chart_window": "8",  # 图表显示的报告期数
    "amount_unit": "亿元",
    "table_density": "comfortable",
}

ALLOWED_KEYS = set(DEFAULT_SETTINGS)


def get_all(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    merged = dict(DEFAULT_SETTINGS)
    merged.update({r["key"]: r["value"] for r in rows if r["key"] in ALLOWED_KEYS})
    return merged


def update(conn: sqlite3.Connection, values: dict[str, str]) -> dict[str, str]:
    for key, value in values.items():
        if key not in ALLOWED_KEYS:
            raise KeyError(key)
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, str(value)),
        )
    return get_all(conn)


def source_line(settings: dict[str, str]) -> str:
    return f"资料来源：{settings['data_source_label']}，{settings['institution_name']}"
