"""研究报告生成与下载。"""

from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.deps import ConnDep, SettingsDep
from app.models.schemas import ReportCreate, ReportOut
from app.services import reports as service

router = APIRouter(prefix="/reports", tags=["reports"])

DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("", response_model=list[ReportOut], summary="已生成报告")
def list_reports(conn: ConnDep) -> list[ReportOut]:
    return [ReportOut(**r) for r in service.list_reports(conn)]


@router.post("", response_model=ReportOut, status_code=201, summary="生成 Word 报告")
def create_report(body: ReportCreate, conn: ConnDep, settings: SettingsDep) -> ReportOut:
    try:
        report = service.generate(conn, settings.reports_dir, body.report_type, body.codes, body.period_end, body.metrics)
    except service.ReportError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ReportOut(**report)


@router.get("/{report_id}/download", summary="下载报告", response_class=FileResponse)
def download_report(report_id: str, conn: ConnDep, settings: SettingsDep) -> FileResponse:
    report = service.get_report(conn, report_id)
    if report is None or not report["file_name"]:
        raise HTTPException(status_code=404, detail="报告不存在。")
    path = settings.reports_dir / report["file_name"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="报告文件已丢失，请重新生成。")
    download_name = f"{report['title']}.docx"
    return FileResponse(path, media_type=DOCX, headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(download_name)}"})


@router.delete("/{report_id}", status_code=204, summary="删除报告")
def delete_report(report_id: str, conn: ConnDep, settings: SettingsDep) -> None:
    report = service.delete_report(conn, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="报告不存在。")
    if report["file_name"]:
        path = settings.reports_dir / report["file_name"]
        if path.exists():
            path.unlink()
