"""汇总所有 /api 路由。新增业务模块时在这里 include 对应的 router。"""

from fastapi import APIRouter

from app.api.routes import alerts, analytics, companies, datasets, export, reports, settings, system

api_router = APIRouter(prefix="/api")
api_router.include_router(system.router)
api_router.include_router(datasets.router)
api_router.include_router(companies.router)
api_router.include_router(analytics.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
api_router.include_router(settings.router)
api_router.include_router(export.router)
