from app.security import API_KEY_PREFIX


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
            "log_source_config": {
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
    assert body["log_source_config"]["budget"]["max_tool_calls"] == 10


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
