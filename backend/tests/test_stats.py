import uuid
from datetime import UTC, datetime, timedelta

from app.models import Incident, IncidentStatus, IncidentTrigger
from tests.conftest import TestingSessionLocal


def _seed_incident(project_id, when, status=IncidentStatus.done):
    db = TestingSessionLocal()
    try:
        inc = Incident(
            project_id=uuid.UUID(project_id), trigger=IncidentTrigger.manual, status=status
        )
        inc.created_at = when
        db.add(inc)
        db.commit()
    finally:
        db.close()


def test_activity_returns_one_bucket_per_day(client):
    signin = client.post("/auth/oauth/callback", json={"dev_email": "act@test.com"}).json()
    headers = {"Authorization": f"Bearer {signin['access_token']}"}
    proj = client.post("/projects", headers=headers, json={"name": "p"}).json()

    now = datetime.now(UTC)
    _seed_incident(proj["id"], now)
    _seed_incident(proj["id"], now - timedelta(days=1))
    _seed_incident(proj["id"], now - timedelta(days=1))

    resp = client.get("/stats/activity?days=7", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["days"]) == 7
    assert body["days"][-1]["total"] == 1        # today
    assert body["days"][-2]["total"] == 2        # yesterday
    assert body["days"][0]["date"] < body["days"][-1]["date"]  # chronological


def test_activity_counts_failed_separately(client):
    signin = client.post("/auth/oauth/callback", json={"dev_email": "fail@test.com"}).json()
    headers = {"Authorization": f"Bearer {signin['access_token']}"}
    proj = client.post("/projects", headers=headers, json={"name": "p"}).json()

    now = datetime.now(UTC)
    _seed_incident(proj["id"], now, status=IncidentStatus.failed)
    _seed_incident(proj["id"], now, status=IncidentStatus.failed)
    _seed_incident(proj["id"], now, status=IncidentStatus.done)

    resp = client.get("/stats/activity?days=7", headers=headers)
    assert resp.status_code == 200
    today = resp.json()["days"][-1]
    assert today["total"] == 3
    assert today["failed"] == 2


def test_activity_is_scoped_per_user(client):
    a = client.post("/auth/oauth/callback", json={"dev_email": "user-a@test.com"}).json()
    a_headers = {"Authorization": f"Bearer {a['access_token']}"}
    a_proj = client.post("/projects", headers=a_headers, json={"name": "a"}).json()

    b = client.post("/auth/oauth/callback", json={"dev_email": "user-b@test.com"}).json()
    b_headers = {"Authorization": f"Bearer {b['access_token']}"}
    b_proj = client.post("/projects", headers=b_headers, json={"name": "b"}).json()

    now = datetime.now(UTC)
    _seed_incident(a_proj["id"], now)
    _seed_incident(b_proj["id"], now)
    _seed_incident(b_proj["id"], now)

    a_today = client.get("/stats/activity?days=7", headers=a_headers).json()["days"][-1]
    b_today = client.get("/stats/activity?days=7", headers=b_headers).json()["days"][-1]

    assert a_today["total"] == 1  # only user A's incident
    assert b_today["total"] == 2  # only user B's incidents
