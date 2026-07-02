from app import jobs
from tests.conftest import StubGraph


def _trigger(client, headers, project_id, trigger="manual"):
    resp = client.post(
        f"/projects/{project_id}/incidents", json={"trigger": trigger}, headers=headers
    )
    assert resp.status_code == 202, resp.text
    return resp.json()


def test_trigger_incident_enqueues_job(client, signin, make_project, enqueued):
    headers = signin()
    project = make_project(headers)
    incident = _trigger(client, headers, project["id"])
    assert incident["status"] == "queued"
    assert incident["trigger"] == "manual"
    assert enqueued == [incident["id"]]


def test_incident_lifecycle_success(client, signin, make_project, enqueued, monkeypatch):
    headers = signin()
    project = make_project(headers)
    incident = _trigger(client, headers, project["id"])

    stub = StubGraph()
    monkeypatch.setattr(jobs, "beacon_graph", stub)
    jobs.run_triage(incident["id"])

    # Budget defaults are passed into invoke.
    assert stub.calls[0]["budget"]["max_tool_calls"] == 15

    detail = client.get(f"/incidents/{incident['id']}", headers=headers).json()
    assert detail["status"] == "done"
    assert detail["finished_at"] is not None
    assert detail["report"]["report_md"].startswith("# Incident report")
    assert detail["report"]["tool_calls_used"] == 3
    assert detail["report"]["tokens_used"] == 1234
    assert detail["report"]["verdicts"][0]["verdict"] == "accept"


def test_incident_lifecycle_respects_project_budget(
    client, signin, make_project, enqueued, monkeypatch
):
    headers = signin()
    project = make_project(
        headers,
        log_source_config={"path": "./app.log", "budget": {"max_tool_calls": 7}},
    )
    incident = _trigger(client, headers, project["id"])
    stub = StubGraph()
    monkeypatch.setattr(jobs, "beacon_graph", stub)
    jobs.run_triage(incident["id"])
    assert stub.calls[0]["budget"]["max_tool_calls"] == 7


def test_incident_lifecycle_failure_marks_failed_and_never_raises(
    client, signin, make_project, enqueued, monkeypatch
):
    headers = signin()
    project = make_project(headers)
    incident = _trigger(client, headers, project["id"])

    monkeypatch.setattr(jobs, "beacon_graph", StubGraph(error=RuntimeError("agent exploded")))
    jobs.run_triage(incident["id"])  # must not raise

    detail = client.get(f"/incidents/{incident['id']}", headers=headers).json()
    assert detail["status"] == "failed"
    assert detail["finished_at"] is not None
    assert "agent exploded" in detail["report"]["accuracy_meta"]["error"]


def test_run_triage_on_finished_incident_is_a_noop(
    client, signin, make_project, enqueued, monkeypatch
):
    headers = signin()
    project = make_project(headers)
    incident = _trigger(client, headers, project["id"])
    stub = StubGraph()
    monkeypatch.setattr(jobs, "beacon_graph", stub)
    jobs.run_triage(incident["id"])
    jobs.run_triage(incident["id"])  # second run skips
    assert len(stub.calls) == 1


def test_incident_history_pagination(client, signin, make_project, enqueued):
    headers = signin()
    project = make_project(headers)
    for _ in range(5):
        _trigger(client, headers, project["id"])

    page1 = client.get(
        f"/projects/{project['id']}/incidents?page=1&page_size=2", headers=headers
    ).json()
    assert page1["total"] == 5
    assert len(page1["items"]) == 2
    page3 = client.get(
        f"/projects/{project['id']}/incidents?page=3&page_size=2", headers=headers
    ).json()
    assert len(page3["items"]) == 1


def test_incident_access_is_scoped_to_owner(client, signin, make_project, enqueued):
    headers_a = signin("a@test.com")
    headers_b = signin("b@test.com")
    project_a = make_project(headers_a)
    incident = _trigger(client, headers_a, project_a["id"])

    assert client.get(f"/incidents/{incident['id']}", headers=headers_b).status_code == 404
    assert (
        client.get(f"/projects/{project_a['id']}/incidents", headers=headers_b).status_code == 404
    )
    assert (
        client.post(f"/projects/{project_a['id']}/incidents", headers=headers_b).status_code
        == 404
    )


def test_invalid_trigger_rejected(client, signin, make_project, enqueued):
    headers = signin()
    project = make_project(headers)
    resp = client.post(
        f"/projects/{project['id']}/incidents", json={"trigger": "cosmic-ray"}, headers=headers
    )
    assert resp.status_code == 422
