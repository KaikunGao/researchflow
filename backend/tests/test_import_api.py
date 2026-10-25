from pathlib import Path

SAMPLE = Path(__file__).resolve().parents[1] / "samples" / "wind_sample_pharma.xlsx"


def test_import_sample_and_snapshot(client):
    assert SAMPLE.exists(), "请先运行 scripts/make_sample.py"
    res = client.post("/api/datasets/import-sample")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["dataset"]["company_count"] == 6
    assert body["dataset"]["period_count"] == 12
    assert "每股收益(摊薄)" in body["unmapped_indicators"]

    companies = client.get("/api/companies").json()
    assert len(companies) == 6
    code = companies[0]["code"]

    snap = client.get(f"/api/companies/{code}/snapshot").json()
    assert snap["period"]["period_end"] == "2024-12-31"
    assert snap["period"]["single"]["revenue"] is not None
    assert snap["period"]["yoy_cumulative"]["revenue"] is not None
    assert "发布 2024 年报" in snap["commentary"]
    assert len(snap["series"]) == 12

    snap_q3 = client.get(f"/api/companies/{code}/snapshot", params={"period": "2024-09-30"}).json()
    assert snap_q3["period"]["label"] == "2024 年三季报"

    stats = client.get("/api/datasets/stats").json()
    assert stats["company_count"] == 6

    export = client.get("/api/export/worksheet", params={"codes": code})
    assert export.status_code == 200
    assert export.headers["content-type"].startswith("application/vnd.openxmlformats")
    assert len(export.content) > 1000

    datasets = client.get("/api/datasets").json()
    assert len(datasets) == 1
    delete = client.delete(f"/api/datasets/{datasets[0]['id']}")
    assert delete.status_code == 204
    assert client.get("/api/companies").json() == []


def test_upload_rejects_unknown_file(client):
    res = client.post("/api/datasets/import", files={"file": ("x.txt", b"hello", "text/plain")})
    assert res.status_code == 422


def test_upload_wide_file(client):
    import io

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["证券代码", "证券简称", "指标名称", "2024-09-30", "2024-12-31"])
    ws.append(["600276.SH", "恒瑞医药", "营业收入(元)", 20_000_000_000, 27_980_000_000])
    ws.append(["600276.SH", "恒瑞医药", "归母净利润(元)", 4_600_000_000, 6_340_000_000])
    buf = io.BytesIO()
    wb.save(buf)
    res = client.post("/api/datasets/import", files={"file": ("hr.xlsx", buf.getvalue(), "application/octet-stream")})
    assert res.status_code == 200, res.text
    snap = client.get("/api/companies/600276.SH/snapshot").json()
    assert snap["period"]["cumulative"]["revenue"] == 279.8
    assert snap["period"]["single"]["revenue"] == 79.8
