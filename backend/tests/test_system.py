from app import __version__


def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "researchflow-api"}


def test_version_returns_app_version(client):
    response = client.get("/api/version")
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == __version__
    assert body["name"] == "ResearchFlow API"
    assert body["environment"]
    assert body["python_version"]


def test_cors_allows_local_frontend(client):
    response = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
