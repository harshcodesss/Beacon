from app.config import settings


def _make_key(client, signin, make_project):
    headers = signin("hook@test.com")
    project = make_project(headers)
    resp = client.post(f"/projects/{project['id']}/api-keys", headers=headers)
    return headers, project, resp.json()["api_key"]


def test_webhook_requires_api_key(client):
    assert client.post("/webhook/github", json={}).status_code == 401


def test_webhook_rejects_invalid_key(client):
    resp = client.post(
        "/webhook/github", json={}, headers={"X-Beacon-Key": "beacon_sk_totally_wrong"}
    )
    assert resp.status_code == 401


def test_webhook_ingests_completed_report(client, signin, make_project):
    headers, project, api_key = _make_key(client, signin, make_project)
    resp = client.post(
        "/webhook/github",
        json={
            "report_md": "# Incident report\n\nRoot cause: DB_URL missing",
            "verdicts": [{"hypothesis_id": "h1", "verdict": "accept", "confidence": 0.9}],
            "hypotheses": [{"id": "h1", "statement": "env var missing"}],
            "tokens_used": 5000,
            "tool_calls_used": 4,
        },
        headers={"X-Beacon-Key": api_key},
    )
    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == "done"

    detail = client.get(f"/incidents/{body['incident_id']}", headers=headers).json()
    assert detail["trigger"] == "action"
    assert detail["status"] == "done"
    assert detail["report"]["tokens_used"] == 5000

    keys = client.get(f"/projects/{project['id']}/api-keys", headers=headers).json()
    assert keys[0]["last_used_at"] is not None


def test_webhook_without_report_enqueues_triage(client, signin, make_project, enqueued):
    _, _, api_key = _make_key(client, signin, make_project)
    resp = client.post("/webhook/github", json={}, headers={"X-Beacon-Key": api_key})
    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == "queued"
    assert enqueued == [body["incident_id"]]


def test_webhook_accepts_bearer_auth(client, signin, make_project, enqueued):
    _, _, api_key = _make_key(client, signin, make_project)
    resp = client.post(
        "/webhook/github", json={}, headers={"Authorization": f"Bearer {api_key}"}
    )
    assert resp.status_code == 202


def test_webhook_rate_limited(client, signin, make_project, enqueued, monkeypatch):
    monkeypatch.setattr(settings, "webhook_rate_limit_per_minute", 3)
    _, _, api_key = _make_key(client, signin, make_project)
    for _ in range(3):
        assert (
            client.post("/webhook/github", json={}, headers={"X-Beacon-Key": api_key}).status_code
            == 202
        )
    resp = client.post("/webhook/github", json={}, headers={"X-Beacon-Key": api_key})
    assert resp.status_code == 429
