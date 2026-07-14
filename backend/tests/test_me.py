def test_patch_me_merges_delivery_pref(client, signin):
    headers = signin("pref@test.com")

    resp = client.patch("/me", headers=headers, json={"preferences": {"delivery": "email"}})
    assert resp.status_code == 200
    assert resp.json()["preferences"]["delivery"] == "email"

    # A second, unrelated pref must not clobber the first (shallow merge, not replace).
    resp2 = client.patch("/me", headers=headers, json={"preferences": {"failures_only": True}})
    assert resp2.status_code == 200

    me = client.get("/me", headers=headers).json()
    assert me["preferences"]["delivery"] == "email"
    assert me["preferences"]["failures_only"] is True
