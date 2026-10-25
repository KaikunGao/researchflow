"""标准底表导出。"""

from datetime import date
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.core.deps import ConnDep
from app.services import repository
from app.services.exporter import build_workbook
from app.services.metrics import build_series

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/worksheet", summary="导出标准底表 Excel（累计 / 单季度 / 比率 / 同比）")
def export_worksheet(
    conn: ConnDep,
    codes: str | None = Query(default=None, description="证券代码，逗号分隔；为空则导出全部公司"),
) -> Response:
    companies = repository.list_companies(conn)
    if codes:
        wanted = {c.strip().upper() for c in codes.split(",") if c.strip()}
        companies = [c for c in companies if c["code"] in wanted]
    if not companies:
        raise HTTPException(status_code=404, detail="没有可导出的公司数据。")

    payload = []
    for company in companies:
        facts = repository.get_company_facts(conn, company["code"])
        if facts:
            payload.append((company, build_series(facts)))
    if not payload:
        raise HTTPException(status_code=404, detail="没有可导出的财务数据。")

    content = build_workbook(payload)
    stem = payload[0][0]["name"] if len(payload) == 1 else "医药板块"
    file_name = f"ResearchFlow_底表_{stem}_{date.today():%Y%m%d}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(file_name)}"},
    )
