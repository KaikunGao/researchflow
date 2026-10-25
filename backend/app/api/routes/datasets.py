"""数据集导入与管理。"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.deps import ConnDep, SettingsDep
from app.models.schemas import DatasetOut, ImportResult, PublicFetchRequest, WorkspaceStats
from app.services import alerts as alert_service
from app.services import repository
from app.services.parser import ParseError, ParsedFact, parse_file
from app.services.public_data import PublicDataError, fetch_many, normalize_code

router = APIRouter(prefix="/datasets", tags=["datasets"])

SAMPLE_FILE_NAME = "wind_sample_pharma.xlsx"


def _import_bytes(conn, file_name: str, content: bytes, display_name: str | None = None) -> ImportResult:
    try:
        parsed = parse_file(file_name, content)
    except ParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    dataset_id = repository.insert_dataset(
        conn,
        name=display_name or Path(file_name).stem,
        file_name=file_name,
        file_type=Path(file_name).suffix.lstrip(".").lower(),
        size_kb=round(len(content) / 1024, 1),
        layout=parsed.layout,
        row_count=parsed.row_count,
        fact_count=len(parsed.facts),
        company_count=parsed.company_count,
        period_count=parsed.period_count,
        warnings=parsed.warnings,
    )
    repository.upsert_facts(conn, dataset_id, parsed.facts)
    alert_service.evaluate(conn)
    dataset = repository.get_dataset(conn, dataset_id)
    assert dataset is not None
    return ImportResult(
        dataset=DatasetOut(**dataset),
        companies=sorted({f"{f.code} {f.name}" for f in parsed.facts}),
        periods=sorted({f.period_end for f in parsed.facts}),
        unmapped_indicators=parsed.unmapped_indicators,
    )


@router.post("/import", response_model=ImportResult, summary="导入 Wind / Choice 导出的 Excel 或 CSV")
async def import_dataset(file: UploadFile, conn: ConnDep, settings: SettingsDep) -> ImportResult:
    if not file.filename:
        raise HTTPException(status_code=422, detail="缺少文件名。")
    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"文件超过 {settings.max_upload_mb} MB 上限。")
    if not content:
        raise HTTPException(status_code=422, detail="文件为空。")
    return _import_bytes(conn, file.filename, content)


@router.post("/import-sample", response_model=ImportResult, summary="导入内置的 Wind 格式示例文件")
def import_sample(conn: ConnDep, settings: SettingsDep) -> ImportResult:
    path = settings.samples_dir / SAMPLE_FILE_NAME
    if not path.exists():
        raise HTTPException(status_code=404, detail="示例文件不存在，请先运行 scripts/make_sample.py 生成。")
    return _import_bytes(conn, SAMPLE_FILE_NAME, path.read_bytes(), display_name="示例：医药板块 Wind 导出（演示数据）")


@router.get("/sample-file", summary="下载示例文件", response_class=FileResponse)
def download_sample(settings: SettingsDep) -> FileResponse:
    path = settings.samples_dir / SAMPLE_FILE_NAME
    if not path.exists():
        raise HTTPException(status_code=404, detail="示例文件不存在。")
    return FileResponse(path, filename=SAMPLE_FILE_NAME, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


def _store_facts(conn, *, name: str, file_name: str, file_type: str, layout: str, facts: list[ParsedFact], warnings: list[str], row_count: int) -> ImportResult:
    dataset_id = repository.insert_dataset(
        conn,
        name=name,
        file_name=file_name,
        file_type=file_type,
        size_kb=0,
        layout=layout,
        row_count=row_count,
        fact_count=len(facts),
        company_count=len({f.code for f in facts}),
        period_count=len({f.period_end for f in facts}),
        warnings=warnings,
    )
    repository.upsert_facts(conn, dataset_id, facts)
    alert_service.evaluate(conn)
    dataset = repository.get_dataset(conn, dataset_id)
    assert dataset is not None
    return ImportResult(
        dataset=DatasetOut(**dataset),
        companies=sorted({f"{f.code} {f.name}" for f in facts}),
        periods=sorted({f.period_end for f in facts}),
        unmapped_indicators=[],
    )


@router.post("/fetch", response_model=ImportResult, summary="从公开数据源（东方财富）按证券代码拉取三大报表")
def fetch_public(body: PublicFetchRequest, conn: ConnDep) -> ImportResult:
    try:
        codes = [normalize_code(c) for c in body.codes if c.strip()]
    except PublicDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not codes:
        raise HTTPException(status_code=422, detail="请至少输入一个证券代码。")
    results, errors = fetch_many(codes, body.start_year)
    if not results:
        raise HTTPException(status_code=502, detail="；".join(errors) or "未能获取任何数据。")
    facts = [f for r in results for f in r.facts]
    warnings = errors + [w for r in results for w in r.warnings]
    names = "、".join(r.name for r in results[:3]) + (f" 等 {len(results)} 家" if len(results) > 3 else "")
    return _store_facts(
        conn,
        name=f"公开数据：东方财富（{names}）",
        file_name=f"eastmoney:{','.join(r.code for r in results)}",
        file_type="api",
        layout="public_api",
        facts=facts,
        warnings=warnings,
        row_count=sum(len(r.periods) for r in results),
    )


@router.get("", response_model=list[DatasetOut], summary="数据集列表")
def list_datasets(conn: ConnDep) -> list[DatasetOut]:
    return [DatasetOut(**d) for d in repository.list_datasets(conn)]


@router.get("/stats", response_model=WorkspaceStats, summary="工作区数据统计")
def stats(conn: ConnDep) -> WorkspaceStats:
    return WorkspaceStats(
        dataset_count=len(repository.list_datasets(conn)),
        company_count=len(repository.list_companies(conn)),
        fact_count=repository.count_facts(conn),
    )


@router.delete("/{dataset_id}", status_code=204, summary="删除数据集及其导入的记录")
def delete_dataset(dataset_id: str, conn: ConnDep) -> None:
    if not repository.delete_dataset(conn, dataset_id):
        raise HTTPException(status_code=404, detail="数据集不存在。")
    conn.execute("DELETE FROM alerts WHERE code NOT IN (SELECT code FROM companies)")
    alert_service.evaluate(conn)
