"""工作区设置。"""

from fastapi import APIRouter

from app.core.deps import ConnDep
from app.models.schemas import SettingsOut, SettingsUpdate
from app.services import settings_store

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsOut, summary="读取设置")
def read_settings(conn: ConnDep) -> SettingsOut:
    return SettingsOut(**settings_store.get_all(conn))


@router.put("", response_model=SettingsOut, summary="保存设置（部分更新）")
def write_settings(body: SettingsUpdate, conn: ConnDep) -> SettingsOut:
    values = {k: v for k, v in body.model_dump().items() if v is not None}
    return SettingsOut(**settings_store.update(conn, values))
