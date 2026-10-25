"""公司财务数据、财报速览。"""

from fastapi import APIRouter, HTTPException, Query

from app.core.deps import ConnDep
from app.models.schemas import CompanyFinancials, CompanyOut, CompanySnapshot, PeriodMetricsOut
from app.services import repository
from app.services.commentary import METHODOLOGY_NOTE, build_commentary
from app.services.fields import FIELD_DEFINITIONS
from app.services.metrics import build_series

router = APIRouter(prefix="/companies", tags=["companies"])

FIELD_LABELS = {f.key: f.label for f in FIELD_DEFINITIONS}


def _company_out(conn, code: str) -> CompanyOut:
    for c in repository.list_companies(conn):
        if c["code"] == code:
            return CompanyOut(**c)
    raise HTTPException(status_code=404, detail=f"未找到公司 {code}，请先导入包含该公司的数据。")


def _series(conn, code: str):
    facts = repository.get_company_facts(conn, code)
    if not facts:
        raise HTTPException(status_code=404, detail=f"公司 {code} 没有财务数据。")
    return [PeriodMetricsOut(**m.__dict__) for m in build_series(facts)], build_series(facts)


@router.get("", response_model=list[CompanyOut], summary="已导入的公司列表")
def list_companies(conn: ConnDep) -> list[CompanyOut]:
    return [CompanyOut(**c) for c in repository.list_companies(conn)]


@router.get("/{code}/financials", response_model=CompanyFinancials, summary="全部报告期的标准化指标")
def company_financials(code: str, conn: ConnDep) -> CompanyFinancials:
    company = _company_out(conn, code)
    series_out, _ = _series(conn, code)
    return CompanyFinancials(company=company, series=series_out, field_labels=FIELD_LABELS, methodology=METHODOLOGY_NOTE)


@router.get("/{code}/snapshot", response_model=CompanySnapshot, summary="财报速览：指标 + 点评段落")
def company_snapshot(
    code: str,
    conn: ConnDep,
    period: str | None = Query(default=None, description="报告期 YYYY-MM-DD，默认最新"),
) -> CompanySnapshot:
    company = _company_out(conn, code)
    series_out, series_raw = _series(conn, code)
    target = series_raw[-1]
    if period:
        matches = [m for m in series_raw if m.period_end == period]
        if not matches:
            raise HTTPException(status_code=404, detail=f"公司 {code} 没有 {period} 的数据。")
        target = matches[0]
    commentary = build_commentary(company.name, company.code, target)
    return CompanySnapshot(
        company=company,
        period=PeriodMetricsOut(**target.__dict__),
        commentary=commentary,
        series=series_out,
        field_labels=FIELD_LABELS,
        methodology=METHODOLOGY_NOTE,
    )
