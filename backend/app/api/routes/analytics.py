"""分析面板：一次返回全部公司 × 报告期 × 指标，供总览 / 财务分析 / 公司对比页面使用。"""

from fastapi import APIRouter

from app.core.deps import ConnDep
from app.models.schemas import AnalyticsPanel, PanelCompany, PanelMetric, PanelPeriodPoint
from app.services import repository
from app.services.catalog import METRIC_CATALOG, flatten
from app.services.commentary import METHODOLOGY_NOTE
from app.services.industry import SUB_INDUSTRY_LABELS, SUB_INDUSTRY_ORDER, classify, label_of
from app.services.metrics import build_series
from app.services.periods import Period

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/panel", response_model=AnalyticsPanel, summary="分析面板数据")
def panel(conn: ConnDep) -> AnalyticsPanel:
    companies_out: list[PanelCompany] = []
    data: dict[str, dict[str, PanelPeriodPoint]] = {}
    periods: set[str] = set()

    for c in repository.list_companies(conn):
        facts = repository.get_company_facts(conn, c["code"])
        if not facts:
            continue
        series = build_series(facts)
        sub = classify(c["code"])
        companies_out.append(
            PanelCompany(code=c["code"], name=c["name"], exchange=c["exchange"], sub_industry=sub, sub_industry_label=label_of(sub),
                         period_count=len(series), latest_period=series[-1].period_end)
        )
        data[c["code"]] = {
            m.period_end: PanelPeriodPoint(period_end=m.period_end, label=m.label, quarter_label=m.quarter_label, values=flatten(m))
            for m in series
        }
        periods.update(m.period_end for m in series)

    sorted_periods = sorted(periods)
    present = {classify(c.code) for c in companies_out}
    return AnalyticsPanel(
        companies=companies_out,
        periods=sorted_periods,
        period_labels={p: Period.from_period_end(p).label for p in sorted_periods},
        metrics=[PanelMetric(**m.__dict__) for m in METRIC_CATALOG],
        sub_industries=[{"key": k, "label": SUB_INDUSTRY_LABELS[k]} for k in SUB_INDUSTRY_ORDER if k in present],
        data=data,
        methodology=METHODOLOGY_NOTE,
    )
