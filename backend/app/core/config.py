"""应用配置。通过环境变量（前缀 RESEARCHFLOW_）或 .env 文件覆盖默认值。"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from app import __version__

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="RESEARCHFLOW_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ResearchFlow API"
    service_name: str = "researchflow-api"
    version: str = __version__
    environment: str = "development"

    # 本地 Next.js 开发服务器地址；逗号分隔可配置多个
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # SQLite 数据库文件路径（相对 backend/ 目录或绝对路径）
    database_path: str = "data/researchflow.db"

    # 单文件上传上限（MB）
    max_upload_mb: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resolved_database_path(self) -> Path:
        path = Path(self.database_path)
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def samples_dir(self) -> Path:
        return BACKEND_ROOT / "samples"

    @property
    def reports_dir(self) -> Path:
        return self.resolved_database_path.parent / "reports"


@lru_cache
def get_settings() -> Settings:
    return Settings()
