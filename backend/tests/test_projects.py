from app import jobs
from app.security import API_KEY_PREFIX
from tests.conftest import StubGraph


def test_create_and_list_projects(client, signin, make_project):
    headers = signin("owner@test.com")
    created = make_project(headers, name="checkout-api")
    listed = client.get("/projects", headers=headers).json()
    names = {p["name"] for p in listed}
    assert "checkout-api" in names
    assert created["repo_full_name"] == "acme/api"


def test_projects_are_scoped_to_owner(client, signin, make_project):
    headers_a = signin("a@test.com")
    headers_b = signin("b@test.com")
    project_a = make_project(headers_a, name="a-only")

    b_projects = client.get("/projects", headers=headers_b).json()
    assert "a-only" not in {p["name"] for p in b_projects}

    # Direct access to someone else's project is a 404, not a 403.
    assert client.get(f"/projects/{project_a['id']}", headers=headers_b).status_code == 404
    assert (
        client.patch(
            f"/projects/{project_a['id']}", json={"name": "hijack"}, headers=headers_b
        ).status_code
        == 404
    )
    assert (
        client.post(f"/projects/{project_a['id']}/api-keys", headers=headers_b).status_code == 404
    )


def test_patch_project_updates_settings(client, signin, make_project):
    headers = signin()
    project = make_project(headers)
    resp = client.patch(
        f"/projects/{project['id']}",
        json={
            "name": "renamed",
            "settings": {
                "path": "./logs/app.log",
                "budget": {"max_tool_calls": 10, "max_tokens": 40000},
                "delivery": "email",
            },
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "renamed"
    assert body["settings"]["budget"]["max_tool_calls"] == 10


def test_api_key_shown_once_and_stored_hashed(client, signin, make_project):
    headers = signin()
    project = make_project(headers)

    created = client.post(f"/projects/{project['id']}/api-keys", headers=headers)
    assert created.status_code == 201
    raw_key = created.json()["api_key"]
    assert raw_key.startswith(API_KEY_PREFIX)

    listed = client.get(f"/projects/{project['id']}/api-keys", headers=headers)
    assert listed.status_code == 200
    entries = listed.json()
    assert len(entries) == 1
    # Metadata only — the raw key or its hash is never exposed after creation.
    assert "api_key" not in entries[0]
    assert "key_hash" not in entries[0]


def test_get_project_not_found(client, signin):
    headers = signin()
    assert (
        client.get("/projects/00000000-0000-0000-0000-000000000000", headers=headers).status_code
        == 404
    )


def test_projects_include_health_rollup(client, signin, make_project, enqueued):
    headers = signin("h@test.com")
    project = make_project(headers, name="svc")
    for _ in range(2):
        client.post(
            f"/projects/{project['id']}/incidents", headers=headers, json={"trigger": "manual"}
        )

    resp = client.get("/projects", headers=headers)
    assert resp.status_code == 200
    row = next(p for p in resp.json() if p["id"] == project["id"])
    assert row["incident_counts"]["total"] == 2
    assert isinstance(row["last_runs"], list)
    assert len(row["last_runs"]) <= 10


def test_projects_health_reflects_failed_incidents(
    client, signin, make_project, enqueued, monkeypatch
):
    headers = signin()
    project = make_project(headers)
    incident = client.post(
        f"/projects/{project['id']}/incidents", headers=headers, json={"trigger": "manual"}
    ).json()

    monkeypatch.setattr(jobs, "beacon_graph", StubGraph(error=RuntimeError("agent exploded")))
    jobs.run_triage(incident["id"])  # marks the incident failed

    resp = client.get("/projects", headers=headers)
    row = next(p for p in resp.json() if p["id"] == project["id"])
    assert row["incident_counts"]["failed"] >= 1
    assert "failed" in row["last_runs"]
    assert row["last_incident_at"] is not None


def test_projects_health_last_runs_capped_at_ten(client, signin, make_project, enqueued):
    headers = signin()
    project = make_project(headers)
    for _ in range(13):
        client.post(
            f"/projects/{project['id']}/incidents", headers=headers, json={"trigger": "manual"}
        )

    resp = client.get("/projects", headers=headers)
    row = next(p for p in resp.json() if p["id"] == project["id"])
    assert row["incident_counts"]["total"] == 13
    assert len(row["last_runs"]) == 10


def test_projects_health_is_scoped_to_owner(client, signin, make_project, enqueued):
    headers_a = signin("a-health@test.com")
    headers_b = signin("b-health@test.com")
    project_a = make_project(headers_a, name="a-health-proj")
    project_b = make_project(headers_b, name="b-health-proj")

    client.post(
        f"/projects/{project_a['id']}/incidents", headers=headers_a, json={"trigger": "manual"}
    )

    resp_b = client.get("/projects", headers=headers_b)
    row_b = next(p for p in resp_b.json() if p["id"] == project_b["id"])
    assert row_b["incident_counts"]["total"] == 0
    assert row_b["last_runs"] == []
    assert row_b["last_incident_at"] is None
