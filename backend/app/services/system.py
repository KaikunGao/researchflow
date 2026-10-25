"""系统信息服务：封装健康检查与版本信息，便于后续扩展（例如检查数据库连接）。"""

import platform

from app.core.config import Settings
from app.models.schemas import HealthResponse, VersionResponse


def get_health(settings: Settings) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.service_name)


def get_version(settings: Settings) -> VersionResponse:
    return VersionResponse(
        name=settings.app_name,
        version=settings.version,
        environment=settings.environment,
        python_version=platform.python_version(),
    )
