def _import(client):
    res = client.post("/api/datasets/import-sample")
    assert res.status_code == 200, res.text


def test_panel_returns_all_companies_and_metrics(client):
    _import(client)
    panel = client.get("/api/analytics/panel").json()
    assert len(panel["companies"]) == 6
    assert len(panel["periods"]) == 12
    keys = {m["key"] for m in panel["metrics"]}
    assert {"revenue", "revenue_yoy", "revenue_single", "gross_margin", "selling_ratio", "inventory_days"} <= keys
    code = panel["companies"][0]["code"]
    point = panel["data"][code]["2024-12-31"]
    assert point["values"]["revenue"] is not None
    assert point["values"]["revenue_single"] is not None
    assert panel["companies"][0]["sub_industry_label"]


def test_alert_rules_and_evaluation(client):
    rules = client.get("/api/alerts/rules").json()
    assert len(rules) == 7
    _import(client)  # 导入会自动评估
    summary = client.get("/api/alerts/summary").json()
    assert summary["rules_total"] == 7
    assert summary["last_evaluated_at"]
    active = client.get("/api/alerts", params={"status": "active"}).json()
    # 示例数据里至少有一家公司 2024 年报净利润下滑 / 销售费用率偏高
    assert active, "expected at least one active alert from sample data"
    alert = active[0]
    assert alert["company_name"]

    # 确认 → 解除
    res = client.patch(f"/api/alerts/{alert['id']}", json={"status": "acknowledged"})
    assert res.json()["status"] == "acknowledged"
    res = client.patch(f"/api/alerts/{alert['id']}", json={"status": "resolved"})
    assert res.json()["resolved_at"]

    # 修改阈值到极端值 → 重新评估后不再触发
    rule_id = alert["rule_id"]
    res = client.patch(f"/api/alerts/rules/{rule_id}", json={"enabled": False})
    assert res.json()["enabled"] is False
    client.post("/api/alerts/evaluate")
    remaining = [a for a in client.get("/api/alerts", params={"status": "active"}).json() if a["rule_id"] == rule_id]
    assert remaining == []

    # 新建规则并触发
    res = client.post("/api/alerts/rules", json={"name": "测试：营收大于 1 亿", "metric_key": "revenue", "operator": "gt", "threshold": 1, "severity": "low"})
    assert res.status_code == 201
    result = client.post("/api/alerts/evaluate").json()
    assert result["created"] == 6
    assert client.delete(f"/api/alerts/rules/{res.json()['id']}").status_code == 204


def test_settings_roundtrip(client):
    current = client.get("/api/settings").json()
    assert current["institution_name"]
    res = client.put("/api/settings", json={"institution_name": "测试证券研究所", "default_basis": "cumulative"})
    assert res.status_code == 200
    body = res.json()
    assert body["institution_name"] == "测试证券研究所"
    assert body["default_basis"] == "cumulative"
    assert client.put("/api/settings", json={"default_basis": "weird"}).status_code == 422


def test_generate_reports(client):
    _import(client)
    companies = [c["code"] for c in client.get("/api/companies").json()]

    res = client.post("/api/reports", json={"report_type": "company_deep_dive", "codes": companies[:1], "metrics": ["revenue", "gross_margin"]})
    assert res.status_code == 201, res.text
    deep = res.json()
    assert deep["status"] == "completed" and deep["file_name"].endswith(".docx")
    download = client.get(f"/api/reports/{deep['id']}/download")
    assert download.status_code == 200
    assert download.content[:2] == b"PK"

    res = client.post("/api/reports", json={"report_type": "peer_comparison", "codes": companies[:3], "metrics": ["revenue_yoy", "gross_margin", "selling_ratio"]})
    assert res.status_code == 201, res.text
    res = client.post("/api/reports", json={"report_type": "industry_overview", "codes": [], "metrics": []})
    assert res.status_code == 201, res.text
    res = client.post("/api/reports", json={"report_type": "periodic_update", "codes": companies[:2], "period_end": "2024-09-30"})
    assert res.status_code == 201, res.text

    assert client.post("/api/reports", json={"report_type": "company_deep_dive", "codes": companies[:2]}).status_code == 422
    listed = client.get("/api/reports").json()
    assert len(listed) == 4
    assert client.delete(f"/api/reports/{deep['id']}").status_code == 204
    assert len(client.get("/api/reports").json()) == 3
