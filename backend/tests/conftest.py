import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as app_db
from app import jobs, ratelimit
from app.config import settings
from app.db import Base, get_db
from app.main import app as fastapi_app

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(autouse=True)
def _test_env(monkeypatch):
    Base.metadata.create_all(engine)
    monkeypatch.setattr(settings, "auth_dev_mode", True)
    monkeypatch.setattr(app_db, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(jobs, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(ratelimit, "_redis_client", fakeredis.FakeRedis())
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def enqueued(monkeypatch):
    """Capture triage enqueues instead of touching Redis/RQ."""
    calls: list[str] = []
    monkeypatch.setattr(jobs, "enqueue_triage", lambda incident_id: calls.append(incident_id))
    return calls


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def signin(client):
    """Dev-mode sign-in helper; returns auth headers for a given email."""

    def _signin(email: str = "user@test.com") -> dict:
        resp = client.post("/auth/oauth/callback", json={"dev_email": email})
        assert resp.status_code == 200, resp.text
        return {"Authorization": f"Bearer {resp.json()['access_token']}"}

    return _signin


@pytest.fixture
def make_project(client, signin):
    def _make(headers: dict | None = None, **overrides) -> dict:
        headers = headers or signin()
        payload = {
            "name": "test-project",
            "repo_full_name": "acme/api",
            "log_source_type": "file",
            "settings": {"path": "./app.log"},
        }
        payload.update(overrides)
        resp = client.post("/projects", json=payload, headers=headers)
        assert resp.status_code == 201, resp.text
        return resp.json()

    return _make


class StubGraph:
    """Stand-in for beacon_graph with the exact invoke contract."""

    def __init__(self, result: dict | None = None, error: Exception | None = None):
        self.result = result or {
            "report": "# Incident report\n\n**Root cause:** stub",
            "verdicts": [{"hypothesis_id": "h1", "verdict": "accept", "confidence": 0.9}],
            "hypotheses": [{"id": "h1", "statement": "stub hypothesis"}],
            "context_pack": {"window": "last 30m"},
            "budget": {"tool_calls_used": 3, "tokens_used": 1234},
        }
        self.error = error
        self.calls: list[dict] = []

    def invoke(self, state: dict) -> dict:
        self.calls.append(state)
        if self.error is not None:
            raise self.error
        return self.result
