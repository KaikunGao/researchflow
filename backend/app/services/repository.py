"""SQLite 数据访问层。"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone

from app.services.parser import ParsedFact


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


# ----------------------------------------------------------------------------- datasets


def insert_dataset(
    conn: sqlite3.Connection,
    *,
    name: str,
    file_name: str,
    file_type: str,
    size_kb: float,
    layout: str,
    row_count: int,
    fact_count: int,
    company_count: int,
    period_count: int,
    warnings: list[str],
    status: str = "ready",
) -> str:
    dataset_id = new_id("ds")
    conn.execute(
        """
        INSERT INTO datasets (id, name, file_name, file_type, size_kb, layout, row_count, fact_count,
                              company_count, period_count, status, warnings, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            dataset_id,
            name,
            file_name,
            file_type,
            size_kb,
            layout,
            row_count,
            fact_count,
            company_count,
            period_count,
            status,
            json.dumps(warnings, ensure_ascii=False),
            _now(),
        ),
    )
    return dataset_id


def list_datasets(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    return [_dataset_row(r) for r in rows]


def get_dataset(conn: sqlite3.Connection, dataset_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    return _dataset_row(row) if row else None


def delete_dataset(conn: sqlite3.Connection, dataset_id: str) -> bool:
    cur = conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.execute("DELETE FROM companies WHERE code NOT IN (SELECT DISTINCT code FROM financial_facts)")
    return cur.rowcount > 0


def _dataset_row(row: sqlite3.Row) -> dict:
    data = dict(row)
    data["warnings"] = json.loads(data.get("warnings") or "[]")
    return data


# ----------------------------------------------------------------------------- companies & facts


def upsert_facts(conn: sqlite3.Connection, dataset_id: str, facts: list[ParsedFact]) -> int:
    """写入事实表；同一 (code, period, field) 后导入的覆盖先导入的。"""
    now = _now()
    companies: dict[str, str] = {}
    for f in facts:
        if f.code not in companies or (f.name and f.name != f.code):
            companies[f.code] = f.name or companies.get(f.code, f.code)
    for code, name in companies.items():
        conn.execute(
            """
            INSERT INTO companies (code, name, exchange, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
            """,
            (code, name, code.split(".")[-1], now),
        )
    conn.executemany(
        """
        INSERT INTO financial_facts (dataset_id, code, period_end, field, value) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(code, period_end, field) DO UPDATE SET value = excluded.value, dataset_id = excluded.dataset_id
        """,
        [(dataset_id, f.code, f.period_end, f.field, f.value) for f in facts],
    )
    return len(facts)


def list_companies(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT c.code, c.name, c.exchange, c.updated_at,
               COUNT(DISTINCT f.period_end) AS period_count,
               MIN(f.period_end) AS first_period,
               MAX(f.period_end) AS latest_period
        FROM companies c
        LEFT JOIN financial_facts f ON f.code = c.code
        GROUP BY c.code
        ORDER BY c.code
        """
    ).fetchall()
    return [dict(r) for r in rows]


def get_company(conn: sqlite3.Connection, code: str) -> dict | None:
    row = conn.execute("SELECT * FROM companies WHERE code = ?", (code,)).fetchone()
    return dict(row) if row else None


def get_company_facts(conn: sqlite3.Connection, code: str) -> dict[str, dict[str, float]]:
    """返回 {period_end: {field: value}}"""
    rows = conn.execute(
        "SELECT period_end, field, value FROM financial_facts WHERE code = ? ORDER BY period_end", (code,)
    ).fetchall()
    out: dict[str, dict[str, float]] = {}
    for r in rows:
        out.setdefault(r["period_end"], {})[r["field"]] = r["value"]
    return out


def count_facts(conn: sqlite3.Connection) -> int:
    return int(conn.execute("SELECT COUNT(*) FROM financial_facts").fetchone()[0])
