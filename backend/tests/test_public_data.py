import os

import pytest

from app.services import public_data
from app.services.public_data import PublicDataError, fetch_company, normalize_code


def test_normalize_code():
    assert normalize_code("600276") == "600276.SH"
    assert normalize_code("300760.sz") == "300760.SZ"
    assert normalize_code(" 000661 ") == "000661.SZ"
    with pytest.raises(PublicDataError):
        normalize_code("恒瑞医药")


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload
        self.text = 'id="hidctype" value="4"'

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeSession:
    """模拟东方财富接口：日期列表 + 分页数据。"""

    def __init__(self):
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None):
        self.calls.append((url.rsplit("/", 1)[-1], params))
        path = url.rsplit("/", 1)[-1]
        if path == "Index":
            return _FakeResponse({})
        if path.endswith("DateAjaxNew"):
            return _FakeResponse({"data": [{"REPORT_DATE": "2024-12-31 00:00:00"}, {"REPORT_DATE": "2024-09-30 00:00:00"}, {"REPORT_DATE": "2018-12-31 00:00:00"}]})
        dates = params["dates"].split(",")
        rows = []
        for d in dates:
            base = {"SECUCODE": "600276.SH", "SECURITY_NAME_ABBR": "恒瑞医药", "REPORT_DATE": f"{d} 00:00:00"}
            if path == "lrbAjaxNew":
                base.update({"TOTAL_OPERATE_INCOME": 27984605342.06 if d.startswith("2024-12") else 20189000000, "OPERATE_COST": 3848177391.88, "PARENT_NETPROFIT": 6336527014.75, "DEDUCT_PARENT_NETPROFIT": None, "SALE_EXPENSE": 9000000000, "RESEARCH_EXPENSE": 6500000000})
            elif path == "zcfzbAjaxNew":
                base.update({"TOTAL_ASSETS": 48000000000, "TOTAL_LIABILITIES": 6000000000, "TOTAL_PARENT_EQUITY": 41000000000, "INVENTORY": 2000000000, "ACCOUNTS_RECE": None, "NOTE_ACCOUNTS_RECE": 4500000000})
            else:
                base.update({"NETCASH_OPERATE": 7600000000})
            rows.append(base)
        return _FakeResponse({"data": rows})


def test_fetch_company_maps_fields_and_filters_years():
    session = _FakeSession()
    result = fetch_company("600276", 2020, session=session)
    assert result.code == "600276.SH"
    assert result.name == "恒瑞医药"
    assert result.periods == ["2024-09-30", "2024-12-31"]  # 2018 被 start_year 过滤
    by = {(f.period_end, f.field): f.value for f in result.facts}
    assert abs(by[("2024-12-31", "revenue")] - 279.846053) < 1e-6
    assert by[("2024-12-31", "accounts_receivable")] == 45.0  # 回退到 NOTE_ACCOUNTS_RECE
    assert ("2024-12-31", "net_profit_deducted") not in by  # None 不写入
    assert by[("2024-12-31", "operating_cash_flow")] == 76.0
    # 只请求了 2 个报告期 → 每张表 1 次分页请求
    assert sum(1 for p, _ in session.calls if p.endswith("AjaxNew") and not p.endswith("DateAjaxNew")) == 3


def test_fetch_endpoint_rejects_bad_code(client):
    res = client.post("/api/datasets/fetch", json={"codes": ["abc"], "start_year": 2020})
    assert res.status_code == 422


def test_fetch_endpoint_with_fake_source(client, monkeypatch):
    monkeypatch.setattr(public_data.requests, "Session", _FakeSession)
    res = client.post("/api/datasets/fetch", json={"codes": ["600276.SH"], "start_year": 2020})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["dataset"]["layout"] == "public_api"
    assert body["companies"] == ["600276.SH 恒瑞医药"]
    snap = client.get("/api/companies/600276.SH/snapshot").json()
    assert snap["period"]["cumulative"]["revenue"] == 279.846053


@pytest.mark.skipif(not os.environ.get("RESEARCHFLOW_LIVE_TESTS"), reason="需要网络：设置 RESEARCHFLOW_LIVE_TESTS=1 启用")
def test_live_fetch_hengrui():
    result = fetch_company("600276.SH", 2023)
    assert result.name == "恒瑞医药"
    by = {(f.period_end, f.field): f.value for f in result.facts}
    assert abs(by[("2024-12-31", "revenue")] - 279.85) < 0.01
    assert abs(by[("2024-12-31", "net_profit")] - 63.37) < 0.01
