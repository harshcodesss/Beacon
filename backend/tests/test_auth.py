from app.config import settings
from app.routes import auth as auth_route


def test_dev_signin_issues_token_and_seeds_demo_project(client):
    resp = client.post("/auth/google/callback", json={"dev_email": "new@test.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["user"]["email"] == "new@test.com"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    projects = client.get("/projects", headers=headers).json()
    assert len(projects) == 1
    demo = projects[0]
    assert demo["log_source_config"].get("demo") is True
    assert demo["incident_count"] == 3
    assert all(i["status"] == "done" for i in demo["recent_incidents"])
    assert demo["accuracy"]["evaluated"] == 3


def test_dev_signin_is_idempotent_no_duplicate_seed(client):
    first = client.post("/auth/google/callback", json={"dev_email": "again@test.com"}).json()
    second = client.post("/auth/google/callback", json={"dev_email": "again@test.com"}).json()
    assert first["user"]["id"] == second["user"]["id"]
    headers = {"Authorization": f"Bearer {second['access_token']}"}
    assert len(client.get("/projects", headers=headers).json()) == 1


def test_dev_signin_rejected_when_dev_mode_off(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    resp = client.post("/auth/google/callback", json={"dev_email": "x@test.com"})
    assert resp.status_code == 401


def test_google_id_token_flow(client, monkeypatch):
    monkeypatch.setattr(
        auth_route.security,
        "verify_google_id_token",
        lambda tok: {"sub": "google-123", "email": "g@test.com", "name": "G User"},
    )
    resp = client.post("/auth/google/callback", json={"id_token": "fake-but-verified"})
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "g@test.com"


def test_invalid_google_token_is_401(client, monkeypatch):
    def boom(tok):
        raise ValueError("bad token")

    monkeypatch.setattr(auth_route.security, "verify_google_id_token", boom)
    resp = client.post("/auth/google/callback", json={"id_token": "garbage"})
    assert resp.status_code == 401


def test_missing_credentials_is_401(client):
    assert client.post("/auth/google/callback", json={}).status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/projects").status_code == 401


def test_protected_route_rejects_garbage_token(client):
    resp = client.get("/projects", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
