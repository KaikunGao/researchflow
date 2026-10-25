"""SQLite 连接与表结构。

数据模型（Phase 2）：
- datasets          导入的文件记录
- companies         公司主数据
- financial_facts   标准化后的财务事实表（长表）：公司 × 报告期 × 字段 → 数值（亿元）
"""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS datasets (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    file_type     TEXT NOT NULL,
    size_kb       REAL NOT NULL,
    layout        TEXT NOT NULL,
    row_count     INTEGER NOT NULL,
    fact_count    INTEGER NOT NULL,
    company_count INTEGER NOT NULL,
    period_count  INTEGER NOT NULL,
    status        TEXT NOT NULL,
    warnings      TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    code       TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    exchange   TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_facts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    code       TEXT NOT NULL REFERENCES companies(code),
    period_end TEXT NOT NULL,
    field      TEXT NOT NULL,
    value      REAL NOT NULL,
    UNIQUE (code, period_end, field)
);

CREATE INDEX IF NOT EXISTS idx_facts_code_period ON financial_facts (code, period_end);

CREATE TABLE IF NOT EXISTS alert_rules (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    metric_key  TEXT NOT NULL,
    operator    TEXT NOT NULL,
    threshold   REAL NOT NULL,
    severity    TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    description TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id           TEXT PRIMARY KEY,
    rule_id      TEXT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    code         TEXT NOT NULL,
    period_end   TEXT NOT NULL,
    metric_key   TEXT NOT NULL,
    value        REAL,
    threshold    REAL NOT NULL,
    operator     TEXT NOT NULL,
    severity     TEXT NOT NULL,
    status       TEXT NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL,
    triggered_at TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    resolved_at  TEXT,
    UNIQUE (rule_id, code, period_end)
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    report_type TEXT NOT NULL,
    codes       TEXT NOT NULL,
    period_end  TEXT,
    metrics     TEXT NOT NULL,
    status      TEXT NOT NULL,
    file_name   TEXT,
    error       TEXT,
    created_at  TEXT NOT NULL
);
"""


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


class Database:
    """轻量级连接管理器，挂在 FastAPI app.state 上。"""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._conn = connect(path)
        init_schema(self._conn)

    @contextmanager
    def session(self) -> Iterator[sqlite3.Connection]:
        try:
            yield self._conn
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise

    def close(self) -> None:
        self._conn.close()
