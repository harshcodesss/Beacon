def test_me_returns_profile(client, signin):
    headers = signin("me@test.com")
    me = client.get("/me", headers=headers).json()
    assert me["email"] == "me@test.com"
    assert me["github_login"] == "dev:me@test.com"
    assert me["preferences"] == {}


def test_me_patch_merges_preferences_and_defaults_new_projects(client, signin):
    headers = signin("prefs@test.com")
    resp = client.patch(
        "/me", headers=headers, json={"name": "Renamed", "preferences": {"delivery": "email"}}
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed"
    assert resp.json()["preferences"]["delivery"] == "email"

    created = client.post(
        "/projects",
        headers=headers,
        json={"name": "uses-default", "settings": {"path": "./app.log"}},
    ).json()
    assert created["settings"]["delivery"] == "email"

    explicit = client.post(
        "/projects",
        headers=headers,
        json={"name": "explicit", "settings": {"delivery": "in_app"}},
    ).json()
    assert explicit["settings"]["delivery"] == "in_app"


def test_me_requires_auth(client):
    assert client.get("/me").status_code == 401


def test_incident_feed_filters_and_paginates(client, signin, enqueued):
    headers = signin("feed@test.com")
    projects = client.get("/projects", headers=headers).json()
    demo_id = projects[0]["id"]

    other = client.post(
        "/projects", headers=headers, json={"name": "other", "settings": {}}
    ).json()
    client.post(f"/projects/{other['id']}/incidents", headers=headers, json={})

    feed = client.get("/incidents", headers=headers).json()
    assert feed["total"] == 4  # 3 seeded done + 1 queued
    assert feed["items"][0]["project_name"] == "other"

    queued_only = client.get("/incidents?status=queued", headers=headers).json()
    assert queued_only["total"] == 1

    demo_only = client.get(f"/incidents?project_id={demo_id}", headers=headers).json()
    assert demo_only["total"] == 3
    assert all(i["project_name"] == "meetpilot-api (demo)" for i in demo_only["items"])

    paged = client.get("/incidents?page=2&page_size=3", headers=headers).json()
    assert len(paged["items"]) == 1

    assert client.get("/incidents?status=bogus", headers=headers).status_code == 422


def test_incident_feed_is_user_scoped(client, signin, enqueued):
    signin("feed-a@test.com")
    headers_b = signin("feed-b@test.com")
    feed = client.get("/incidents", headers=headers_b).json()
    assert feed["total"] == 3  # only their own seeded incidents


def test_stats_overview_aggregates(client, signin, enqueued):
    headers = signin("stats@test.com")
    stats = client.get("/stats/overview", headers=headers).json()
    assert stats["total_incidents"] == 3
    assert stats["done"] == 3
    assert stats["failed"] == 0
    assert stats["accuracy"]["evaluated"] == 3
    assert stats["avg_tool_calls"] > 0
    assert stats["avg_tokens"] > 0

    projects = client.get("/projects", headers=headers).json()
    client.post(f"/projects/{projects[0]['id']}/incidents", headers=headers, json={})
    stats = client.get("/stats/overview", headers=headers).json()
    assert stats["total_incidents"] == 4
    assert stats["active"] == 1
