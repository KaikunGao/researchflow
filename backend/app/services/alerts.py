"""告警规则引擎。

规则作用于每家公司的最新报告期；评估时：
- 条件成立 → 创建 / 保持活跃告警（同一规则、公司、报告期只有一条）；
- 条件不再成立或规则被禁用 → 把该规则在该公司下的活跃告警标记为已解除。
"""

import sqlite3
from datetime import datetime, timezone

from app.services import repository
from app.services.catalog import METRIC_MAP, flatten, format_value
from app.services.metrics import build_series
from app.services.periods import Period

OPERATOR_TEXT = {"lt": "<", "gt": ">"}

DEFAULT_RULES: list[dict] = [
    {"id": "rule-revenue-decline", "name": "营收同比下滑", "metric_key": "revenue_yoy", "operator": "lt", "threshold": 0, "severity": "medium", "enabled": 1,
     "description": "最新报告期营业收入累计同比增速低于 0%。"},
    {"id": "rule-profit-plunge", "name": "净利润大幅下滑", "metric_key": "net_profit_yoy", "operator": "lt", "threshold": -30, "severity": "high", "enabled": 1,
     "description": "最新报告期归母净利润累计同比增速低于 -30%。"},
    {"id": "rule-revenue-qoq", "name": "单季度营收环比大幅下滑", "metric_key": "revenue_qoq", "operator": "lt", "threshold": -30, "severity": "medium", "enabled": 1,
     "description": "最新单季度营业收入环比下滑超过 30%，关注季节性之外的需求变化。"},
    {"id": "rule-gross-margin", "name": "毛利率跌破警戒线", "metric_key": "gross_margin", "operator": "lt", "threshold": 25, "severity": "medium", "enabled": 1,
     "description": "累计毛利率低于 25%，提示产品结构或集采降价压力。"},
    {"id": "rule-selling-ratio", "name": "销售费用率偏高", "metric_key": "selling_ratio", "operator": "gt", "threshold": 40, "severity": "low", "enabled": 1,
     "description": "销售费用率高于 40%，关注合规与推广效率。"},
    {"id": "rule-debt", "name": "资产负债率偏高", "metric_key": "debt_ratio", "operator": "gt", "threshold": 60, "severity": "low", "enabled": 1,
     "description": "资产负债率高于 60%，关注偿债压力。"},
    {"id": "rule-roe", "name": "ROE 低于基准", "metric_key": "roe_diluted", "operator": "lt", "threshold": 5, "severity": "low", "enabled": 0,
     "description": "摊薄 ROE 低于 5%，盈利能力弱于行业平均（默认关闭，年报口径更有意义）。"},
]


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


# --------------------------------------------------------------------------- rules


def seed_default_rules(conn: sqlite3.Connection) -> None:
    count = conn.execute("SELECT COUNT(*) FROM alert_rules").fetchone()[0]
    if count:
        return
    now = _now()
    conn.executemany(
        """INSERT INTO alert_rules (id, name, metric_key, operator, threshold, severity, enabled, description, created_at, updated_at)
           VALUES (:id, :name, :metric_key, :operator, :threshold, :severity, :enabled, :description, :created_at, :updated_at)""",
        [{**r, "created_at": now, "updated_at": now} for r in DEFAULT_RULES],
    )


def list_rules(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM alert_rules ORDER BY created_at, id").fetchall()
    return [_rule_row(r) for r in rows]


def get_rule(conn: sqlite3.Connection, rule_id: str) -> dict | None:
    row = conn.execute("SELECT * FROM alert_rules WHERE id = ?", (rule_id,)).fetchone()
    return _rule_row(row) if row else None


def create_rule(conn: sqlite3.Connection, data: dict) -> dict:
    now = _now()
    rule_id = repository.new_id("rule")
    conn.execute(
        """INSERT INTO alert_rules (id, name, metric_key, operator, threshold, severity, enabled, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (rule_id, data["name"], data["metric_key"], data["operator"], float(data["threshold"]), data["severity"],
         1 if data.get("enabled", True) else 0, data.get("description", ""), now, now),
    )
    rule = get_rule(conn, rule_id)
    assert rule is not None
    return rule


def update_rule(conn: sqlite3.Connection, rule_id: str, data: dict) -> dict | None:
    current = get_rule(conn, rule_id)
    if current is None:
        return None
    merged = {**current, **{k: v for k, v in data.items() if v is not None}}
    conn.execute(
        """UPDATE alert_rules SET name = ?, metric_key = ?, operator = ?, threshold = ?, severity = ?, enabled = ?,
           description = ?, updated_at = ? WHERE id = ?""",
        (merged["name"], merged["metric_key"], merged["operator"], float(merged["threshold"]), merged["severity"],
         1 if merged["enabled"] else 0, merged["description"], _now(), rule_id),
    )
    return get_rule(conn, rule_id)


def delete_rule(conn: sqlite3.Connection, rule_id: str) -> bool:
    return conn.execute("DELETE FROM alert_rules WHERE id = ?", (rule_id,)).rowcount > 0


def _rule_row(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["enabled"] = bool(d["enabled"])
    return d


# --------------------------------------------------------------------------- alerts


def list_alerts(conn: sqlite3.Connection, status: str | None = None) -> list[dict]:
    sql = """SELECT a.*, c.name AS company_name, r.name AS rule_name
             FROM alerts a LEFT JOIN companies c ON c.code = a.code LEFT JOIN alert_rules r ON r.id = a.rule_id"""
    params: tuple = ()
    if status:
        sql += " WHERE a.status = ?"
        params = (status,)
    sql += " ORDER BY CASE a.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, a.triggered_at DESC"
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def set_alert_status(conn: sqlite3.Connection, alert_id: str, status: str) -> dict | None:
    now = _now()
    resolved_at = now if status == "resolved" else None
    cur = conn.execute(
        "UPDATE alerts SET status = ?, updated_at = ?, resolved_at = COALESCE(?, resolved_at) WHERE id = ?",
        (status, now, resolved_at, alert_id),
    )
    if cur.rowcount == 0:
        return None
    row = conn.execute(
        """SELECT a.*, c.name AS company_name, r.name AS rule_name FROM alerts a
           LEFT JOIN companies c ON c.code = a.code LEFT JOIN alert_rules r ON r.id = a.rule_id WHERE a.id = ?""",
        (alert_id,),
    ).fetchone()
    return dict(row) if row else None


def summary(conn: sqlite3.Connection) -> dict:
    rows = conn.execute("SELECT status, severity, COUNT(*) AS n FROM alerts GROUP BY status, severity").fetchall()
    out = {"active_high": 0, "active_medium": 0, "active_low": 0, "acknowledged": 0, "resolved": 0, "active_total": 0}
    for r in rows:
        if r["status"] == "active":
            out[f"active_{r['severity']}"] += r["n"]
            out["active_total"] += r["n"]
        elif r["status"] == "acknowledged":
            out["acknowledged"] += r["n"]
        elif r["status"] == "resolved":
            out["resolved"] += r["n"]
    rules = list_rules(conn)
    out["rules_enabled"] = sum(1 for r in rules if r["enabled"])
    out["rules_total"] = len(rules)
    last = conn.execute("SELECT value FROM settings WHERE key = '_alerts_last_evaluated'").fetchone()
    out["last_evaluated_at"] = last["value"] if last else None
    return out


def evaluate(conn: sqlite3.Connection) -> dict:
    """对所有公司的最新报告期运行全部规则，返回 {created, kept, resolved}。"""
    seed_default_rules(conn)
    rules = list_rules(conn)
    now = _now()
    created = kept = resolved = 0

    for company in repository.list_companies(conn):
        code = company["code"]
        facts = repository.get_company_facts(conn, code)
        if not facts:
            continue
        latest = build_series(facts)[-1]
        flat = flatten(latest)
        period = Period.from_period_end(latest.period_end)

        for rule in rules:
            metric = METRIC_MAP.get(rule["metric_key"])
            value = flat.get(rule["metric_key"]) if metric else None
            hit = (
                rule["enabled"]
                and metric is not None
                and value is not None
                and (value < rule["threshold"] if rule["operator"] == "lt" else value > rule["threshold"])
            )
            if hit:
                existing = conn.execute(
                    "SELECT id, status FROM alerts WHERE rule_id = ? AND code = ? AND period_end = ?",
                    (rule["id"], code, latest.period_end),
                ).fetchone()
                if existing:
                    conn.execute("UPDATE alerts SET value = ?, updated_at = ? WHERE id = ?", (value, now, existing["id"]))
                    kept += 1
                    continue
                # 同一规则、同一公司的旧报告期活跃告警 → 被新报告期替代，自动解除
                conn.execute(
                    """UPDATE alerts SET status = 'resolved', resolved_at = ?, updated_at = ?
                       WHERE rule_id = ? AND code = ? AND status IN ('active', 'acknowledged') AND period_end <> ?""",
                    (now, now, rule["id"], code, latest.period_end),
                )
                title = f"{rule['name']}"
                desc = (
                    f"{period.label}{metric.label} {format_value(value, metric, signed=metric.unit in ('%', 'pct'))}，"
                    f"触发条件：{metric.short_label} {OPERATOR_TEXT[rule['operator']]} {format_value(rule['threshold'], metric)}。"
                )
                conn.execute(
                    """INSERT INTO alerts (id, rule_id, code, period_end, metric_key, value, threshold, operator, severity, status,
                                           title, description, triggered_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)""",
                    (repository.new_id("alt"), rule["id"], code, latest.period_end, rule["metric_key"], value,
                     rule["threshold"], rule["operator"], rule["severity"], title, desc, now, now),
                )
                created += 1
            else:
                cur = conn.execute(
                    """UPDATE alerts SET status = 'resolved', resolved_at = ?, updated_at = ?
                       WHERE rule_id = ? AND code = ? AND status IN ('active', 'acknowledged')""",
                    (now, now, rule["id"], code),
                )
                resolved += cur.rowcount

    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('_alerts_last_evaluated', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (now,),
    )
    return {"created": created, "kept": kept, "resolved": resolved, "evaluated_at": now}
