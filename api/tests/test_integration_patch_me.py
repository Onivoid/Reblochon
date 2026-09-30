from fastapi.testclient import TestClient


def test_patch_me(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = client.patch("/me", headers=headers, json={"display_name": "Bob"})
    assert response.status_code == 200
    assert response.json()["display_name"] == "Bob"


def test_patch_me_avatar(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    body = {
        "avatar_config": {
            "hue": 120,
            "tone": 0.4,
            "expression": "happy",
            "background": "circle",
        }
    }

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    response = client.patch("/me", headers=headers, json=body)
    assert response.status_code == 200
    assert response.json()["avatar_config"] == body["avatar_config"]
