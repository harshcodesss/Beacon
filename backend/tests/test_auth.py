from datetime import UTC, datetime, timedelta

from app.config import settings
from app.routes import auth as auth_route
from tests.conftest import TestingSessionLocal


def test_dev_signin_issues_token_and_seeds_demo_project(client):
    resp = client.post("/auth/oauth/callback", json={"dev_email": "new@test.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["access_token"]
    assert data["user"]["email"] == "new@test.com"
    assert data["user"]["github_login"] == "dev:new@test.com"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    projects = client.get("/projects", headers=headers).json()
    assert len(projects) == 1
    demo = projects[0]
    assert demo["settings"].get("demo") is True
    assert demo["incident_count"] == 4  # 3 done + 1 failed
    statuses = {i["status"] for i in demo["recent_incidents"]}
    assert statuses == {"done", "failed"}
    assert demo["accuracy"]["evaluated"] == 3


def test_dev_signin_is_idempotent_no_duplicate_seed(client):
    first = client.post("/auth/oauth/callback", json={"dev_email": "again@test.com"}).json()
    second = client.post("/auth/oauth/callback", json={"dev_email": "again@test.com"}).json()
    assert first["user"]["id"] == second["user"]["id"]
    headers = {"Authorization": f"Bearer {second['access_token']}"}
    assert len(client.get("/projects", headers=headers).json()) == 1


def test_dev_signin_rejected_when_dev_mode_off(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    resp = client.post("/auth/oauth/callback", json={"dev_email": "x@test.com"})
    assert resp.status_code == 401


def test_github_access_token_flow(client, monkeypatch):
    monkeypatch.setattr(
        auth_route.security,
        "verify_github_access_token",
        lambda tok: {"login": "octocat", "email": "octo@test.com", "name": "Octo Cat"},
    )
    resp = client.post("/auth/oauth/callback", json={"access_token": "gho_fake_but_verified"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user"]["email"] == "octo@test.com"
    assert data["user"]["github_login"] == "octocat"


def test_invalid_github_token_is_401(client, monkeypatch):
    def boom(tok):
        raise ValueError("bad token")

    monkeypatch.setattr(auth_route.security, "verify_github_access_token", boom)
    resp = client.post("/auth/oauth/callback", json={"access_token": "garbage"})
    assert resp.status_code == 401


def test_missing_credentials_is_401(client):
    assert client.post("/auth/oauth/callback", json={}).status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/projects").status_code == 401


def test_protected_route_rejects_garbage_token(client):
    resp = client.get("/projects", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


# ---- refresh sessions ----


def _signin_tokens(client, remember=False, email="rt@test.com"):
    resp = client.post(
        "/auth/oauth/callback", json={"dev_email": email, "remember": remember}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _backdate_session(raw_refresh: str, **deltas):
    """Shift a session's clocks into the past to simulate elapsed time."""
    from app.models import AuthSession
    from app.security import hash_refresh_token

    db = TestingSessionLocal()
    try:
        session = (
            db.query(AuthSession)
            .filter(AuthSession.refresh_token_hash == hash_refresh_token(raw_refresh))
            .one()
        )
        if "idle_hours" in deltas:
            session.last_used_at = datetime.now(UTC) - timedelta(hours=deltas["idle_hours"])
        if "age_days" in deltas:
            session.absolute_expires_at = datetime.now(UTC) - timedelta(
                days=deltas["age_days"]
            )
        db.commit()
    finally:
        db.close()


def test_signin_returns_refresh_token_and_expiry(client):
    data = _signin_tokens(client)
    assert data["refresh_token"].startswith("beacon_rt_")
    assert data["expires_in"] == settings.jwt_expires_minutes * 60


def test_refresh_rotates_token_and_old_one_dies(client):
    data = _signin_tokens(client)
    first = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert first.status_code == 200
    rotated = first.json()
    assert rotated["refresh_token"] != data["refresh_token"]
    assert rotated["access_token"]

    # replaying the pre-rotation token is a 401, same as a fake one
    replay = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert replay.status_code == 401

    # the rotated token still works
    again = client.post("/auth/refresh", json={"refresh_token": rotated["refresh_token"]})
    assert again.status_code == 200


def test_refreshed_access_token_hits_protected_routes(client):
    data = _signin_tokens(client)
    rotated = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]}).json()
    headers = {"Authorization": f"Bearer {rotated['access_token']}"}
    assert client.get("/projects", headers=headers).status_code == 200


def test_idle_expiry_without_remember(client):
    data = _signin_tokens(client, remember=False)
    _backdate_session(data["refresh_token"], idle_hours=settings.refresh_idle_hours + 1)
    resp = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 401


def test_no_idle_expiry_with_remember(client):
    data = _signin_tokens(client, remember=True)
    _backdate_session(data["refresh_token"], idle_hours=settings.refresh_idle_hours + 1)
    resp = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 200


def test_absolute_expiry_applies_even_with_remember(client):
    data = _signin_tokens(client, remember=True)
    _backdate_session(data["refresh_token"], age_days=1)  # ceiling now in the past
    resp = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 401


def test_logout_revokes_session(client):
    data = _signin_tokens(client)
    resp = client.post("/auth/logout", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 204
    dead = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert dead.status_code == 401


def test_logout_is_idempotent(client):
    resp = client.post("/auth/logout", json={"refresh_token": "beacon_rt_never_existed"})
    assert resp.status_code == 204
