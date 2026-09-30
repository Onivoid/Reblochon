from fastapi.testclient import TestClient


def test_default_team_description(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = client.get("/teams", headers=headers)
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Default"
    assert response.json()[0]["description"] == "Équipe de démarrage"


def test_default_team_description_edition(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    team_id = client.get("/teams", headers=headers).json()[0]["id"]

    response = client.patch(
        f"/teams/{team_id}", headers=headers, json={"description": "My new description"}
    )
    assert response.status_code == 200
    assert response.json()["description"] == "My new description"


def test_default_team_description_edited_to_empty(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    team_id = client.get("/teams", headers=headers).json()[0]["id"]

    response = client.patch(f"/teams/{team_id}", headers=headers, json={"description": ""})
    assert response.status_code == 200
    assert response.json()["description"] is None


def test_default_team_description_edition_by_non_owner_must_fail(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    data2 = register_user(display_name="Bob")
    assert "access_token" in data2
    assert data2["user"]["display_name"] == "Bob"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    headers2 = {"Authorization": f"Bearer {data2['access_token']}"}
    team_id = client.get("/teams", headers=headers).json()[0]["id"]

    invite_response = client.post(
        f"/teams/{team_id}/invites",
        headers=headers,
        json={"email": data2["user"]["email"]},
    )
    assert invite_response.status_code == 200

    token = invite_response.json()["token"]
    accept_response = client.post(f"/teams/invites/{token}/accept", headers=headers2)
    assert accept_response.status_code == 200

    edit_response = client.patch(
        f"/teams/{team_id}",
        headers=headers2,
        json={"description": "My new description"},
    )
    assert edit_response.status_code == 403
    assert edit_response.json()["detail"] == "owner_required"
