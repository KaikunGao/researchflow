"""系统类接口：健康检查与版本信息。"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.models.schemas import HealthResponse, VersionResponse
from app.services import system as system_service

router = APIRouter(tags=["system"])

SettingsDep = Annotated[Settings, Depends(get_settings)]


@router.get("/health", response_model=HealthResponse, summary="健康检查")
def health(settings: SettingsDep) -> HealthResponse:
    return system_service.get_health(settings)


@router.get("/version", response_model=VersionResponse, summary="版本信息")
def version(settings: SettingsDep) -> VersionResponse:
    return system_service.get_version(settings)
