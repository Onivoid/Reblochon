from fastapi.testclient import TestClient


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_bootstraps_default_team(client: TestClient, register_user):
    data = register_user(display_name="Alice")
    assert "access_token" in data
    assert data["user"]["display_name"] == "Alice"

    headers = {"Authorization": f"Bearer {data['access_token']}"}
    teams = client.get("/teams", headers=headers)
    assert teams.status_code == 200
    team_list = teams.json()
    assert len(team_list) == 1
    assert team_list[0]["name"] == "Default"

    projects = client.get(f"/teams/{team_list[0]['id']}/projects", headers=headers)
    assert projects.status_code == 200
    project_list = projects.json()
    assert len(project_list) == 1
    assert project_list[0]["name"] == "Général"

    columns = client.get(f"/projects/{project_list[0]['id']}/columns", headers=headers)
    assert columns.status_code == 200
    assert len(columns.json()) == 3
