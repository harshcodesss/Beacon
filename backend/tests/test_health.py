import pytest

from app.config import settings
from app.main import assert_safe_boot


def test_healthz(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["redis"] == "ok"
    assert body["agent_core"] == "mock"


def test_boot_refused_in_production_with_dev_mode(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "auth_dev_mode", True)
    with pytest.raises(RuntimeError, match="Refusing to start"):
        assert_safe_boot()


def test_boot_allowed_in_production_without_dev_mode(monkeypatch):
    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "auth_dev_mode", False)
    assert_safe_boot()
