"""FastAPI 依赖注入。"""

import sqlite3
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.db import Database


def get_database(request: Request) -> Database:
    return request.app.state.db


def get_conn(db: Annotated[Database, Depends(get_database)]) -> Iterator[sqlite3.Connection]:
    with db.session() as conn:
        yield conn


SettingsDep = Annotated[Settings, Depends(get_settings)]
ConnDep = Annotated[sqlite3.Connection, Depends(get_conn)]
