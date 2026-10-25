"""异常监控：规则管理、评估、告警状态流转。"""

from fastapi import APIRouter, HTTPException, Query

from app.core.deps import ConnDep
from app.models.schemas import (
    AlertOut,
    AlertRuleCreate,
    AlertRuleOut,
    AlertRuleUpdate,
    AlertStatusUpdate,
    AlertSummary,
    EvaluateResult,
)
from app.services import alerts as service
from app.services.catalog import METRIC_MAP

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut], summary="告警列表")
def list_alerts(conn: ConnDep, status: str | None = Query(default=None, pattern="^(active|acknowledged|resolved)$")) -> list[AlertOut]:
    service.seed_default_rules(conn)
    return [AlertOut(**a) for a in service.list_alerts(conn, status)]


@router.get("/summary", response_model=AlertSummary, summary="告警汇总")
def alert_summary(conn: ConnDep) -> AlertSummary:
    service.seed_default_rules(conn)
    return AlertSummary(**service.summary(conn))


@router.post("/evaluate", response_model=EvaluateResult, summary="按当前规则重新评估全部公司")
def evaluate(conn: ConnDep) -> EvaluateResult:
    return EvaluateResult(**service.evaluate(conn))


@router.patch("/{alert_id}", response_model=AlertOut, summary="更新告警状态（确认 / 解除 / 重新激活）")
def update_alert(alert_id: str, body: AlertStatusUpdate, conn: ConnDep) -> AlertOut:
    updated = service.set_alert_status(conn, alert_id, body.status)
    if updated is None:
        raise HTTPException(status_code=404, detail="告警不存在。")
    return AlertOut(**updated)


@router.get("/rules", response_model=list[AlertRuleOut], summary="告警规则列表")
def list_rules(conn: ConnDep) -> list[AlertRuleOut]:
    service.seed_default_rules(conn)
    return [AlertRuleOut(**r) for r in service.list_rules(conn)]


@router.post("/rules", response_model=AlertRuleOut, status_code=201, summary="新建规则")
def create_rule(body: AlertRuleCreate, conn: ConnDep) -> AlertRuleOut:
    if body.metric_key not in METRIC_MAP:
        raise HTTPException(status_code=422, detail="未知的指标。")
    return AlertRuleOut(**service.create_rule(conn, body.model_dump()))


@router.patch("/rules/{rule_id}", response_model=AlertRuleOut, summary="修改规则（阈值 / 启用等）")
def update_rule(rule_id: str, body: AlertRuleUpdate, conn: ConnDep) -> AlertRuleOut:
    if body.metric_key is not None and body.metric_key not in METRIC_MAP:
        raise HTTPException(status_code=422, detail="未知的指标。")
    updated = service.update_rule(conn, rule_id, body.model_dump())
    if updated is None:
        raise HTTPException(status_code=404, detail="规则不存在。")
    return AlertRuleOut(**updated)


@router.delete("/rules/{rule_id}", status_code=204, summary="删除规则")
def delete_rule(rule_id: str, conn: ConnDep) -> None:
    if not service.delete_rule(conn, rule_id):
        raise HTTPException(status_code=404, detail="规则不存在。")
