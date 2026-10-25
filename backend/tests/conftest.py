import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path) -> Iterator[TestClient]:
    os.environ["RESEARCHFLOW_DATABASE_PATH"] = str(tmp_path / "test.db")
    settings = Settings()
    app = create_app(settings)
    with TestClient(app) as c:
        yield c
